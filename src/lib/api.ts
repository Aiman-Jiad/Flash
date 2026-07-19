import { supabase } from '@/lib/supabase'
import type { Profile, Post, Comment, Story, Reel, Notification, Message, Conversation } from '@/types'

// ---------- Profiles ----------
export async function getProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data as Profile | null
}

export async function getProfileByUsername(username: string) {
  const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
  return data as Profile | null
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: patch.username,
      full_name: patch.full_name,
      bio: patch.bio,
      avatar_url: patch.avatar_url,
      website: patch.website,
      is_private: patch.is_private,
    })
    .eq('id', userId)
    .select('*')
    .maybeSingle()
  return { data: data as Profile | null, error }
}

export async function searchProfiles(q: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(30)
  return (data || []) as Profile[]
}

export async function getFollowStats(userId: string) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return { followers: followers || 0, following: following || 0 }
}

export async function isFollowing(followerId: string, followeeId: string) {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle()
  return !!data
}

export async function toggleFollow(followerId: string, followeeId: string) {
  const existing = await isFollowing(followerId, followeeId)
  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId)
    return false
  }
  await supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId })
  await supabase.from('notifications').insert({
    user_id: followeeId,
    actor_id: followerId,
    type: 'follow',
  })
  return true
}

// ---------- Posts ----------
export interface FeedPost extends Post {
  score?: number
}

export async function getFeedPage(opts: { userId: string; cursor?: string; limit?: number }) {
  const { userId, cursor, limit = 6 } = opts
  // Build base query joining profile + images
  let q = supabase
    .from('posts')
    .select(`
      *,
      profile:profiles!posts_user_id_fkey(*),
      images:post_images(*),
      likes!inner(post_id)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit * 4) // fetch more, then rank

  if (cursor) q = q.lt('created_at', cursor)

  const { data, error } = await q
  if (error) return { items: [] as FeedPost[], nextCursor: null as string | null }

  // We joined likes just to count; restructure
  const posts = (data || []).map((p: any) => ({
    ...p,
    like_count: p.likes?.length ?? p.like_count ?? 0,
    likes: undefined,
  })) as FeedPost[]

  // Get following set
  const { data: follows } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', userId)
  const followingSet = new Set((follows || []).map((f) => f.followee_id))

  // Get my likes
  const postIds = posts.map((p) => p.id)
  const { data: myLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)
  const likedSet = new Set((myLikes || []).map((l) => l.post_id))

  // Get my saves
  const { data: mySaves } = await supabase
    .from('saves')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)
  const savedSet = new Set((mySaves || []).map((s) => s.post_id))

  // Score: recency + likes + following boost
  const now = Date.now()
  const scored = posts.map((p) => {
    const ageHours = (now - new Date(p.created_at).getTime()) / 3_600_000
    const recency = 1 / (1 + ageHours * 0.5)
    const likeScore = Math.log(p.like_count + 1)
    const followBoost = followingSet.has(p.user_id) ? 1.5 : 1
    const score = (recency * 2 + likeScore) * followBoost
    return { ...p, score, liked_by_me: likedSet.has(p.id), saved_by_me: savedSet.has(p.id) }
  })

  scored.sort((a, b) => (b.score! - a.score!))
  const items = scored.slice(0, limit)
  const nextCursor = posts.length === limit * 4 ? posts[posts.length - 1].created_at : null
  return { items, nextCursor }
}

export async function getPost(postId: string) {
  const { data } = await supabase
    .from('posts')
    .select(`*, profile:profiles!posts_user_id_fkey(*), images:post_images(*)`)
    .eq('id', postId)
    .maybeSingle()
  return data as Post | null
}

export async function getUserPosts(userId: string) {
  const { data } = await supabase
    .from('posts')
    .select(`*, images:post_images(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []) as Post[]
}

export async function getSavedPosts(userId: string) {
  const { data } = await supabase
    .from('saves')
    .select(`post:posts(*, images:post_images(*))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []).map((s: any) => s.post) as Post[]
}

export async function getExplorePosts(limit = 30) {
  const { data } = await supabase
    .from('posts')
    .select(`*, images:post_images(*)`)
    .order('like_count', { ascending: false })
    .limit(limit)
  return (data || []) as Post[]
}

export async function createPost(opts: { userId: string; caption: string | null; location: string | null; imageUrls: string[] }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: opts.userId, caption: opts.caption, location: opts.location })
    .select('*')
    .maybeSingle()
  if (error || !data) return { post: null, error }
  const post = data as Post
  if (opts.imageUrls.length) {
    await supabase
      .from('post_images')
      .insert(opts.imageUrls.map((url, i) => ({ post_id: post.id, url, position: i })))
  }
  return { post, error: null }
}

export async function deletePost(postId: string) {
  await supabase.from('posts').delete().eq('id', postId)
}

export async function toggleLike(postId: string, userId: string, postOwnerId: string) {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()
  if (data) {
    await supabase.from('likes').delete().eq('id', data.id)
    return false
  }
  await supabase.from('likes').insert({ post_id: postId, user_id: userId })
  if (postOwnerId !== userId) {
    await supabase.from('notifications').insert({
      user_id: postOwnerId,
      actor_id: userId,
      type: 'like',
      entity_id: postId,
    })
  }
  return true
}

export async function toggleSave(postId: string, userId: string) {
  const { data } = await supabase
    .from('saves')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()
  if (data) {
    await supabase.from('saves').delete().eq('id', data.id)
    return false
  }
  await supabase.from('saves').insert({ post_id: postId, user_id: userId })
  return true
}

// ---------- Comments ----------
export async function getComments(postId: string) {
  const { data } = await supabase
    .from('comments')
    .select(`*, profile:profiles!comments_user_id_fkey(*)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  const all = (data || []) as Comment[]
  // build tree
  const byId = new Map<string, Comment>()
  all.forEach((c) => byId.set(c.id, { ...c, replies: [] }))
  const roots: Comment[] = []
  all.forEach((c) => {
    const node = byId.get(c.id)!
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export async function addComment(opts: { postId: string; userId: string; body: string; parentId?: string | null; postOwnerId: string }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: opts.postId, user_id: opts.userId, body: opts.body, parent_id: opts.parentId ?? null })
    .select(`*, profile:profiles!comments_user_id_fkey(*)`)
    .maybeSingle()
  if (error || !data) return null
  if (opts.postOwnerId !== opts.userId) {
    await supabase.from('notifications').insert({
      user_id: opts.postOwnerId,
      actor_id: opts.userId,
      type: opts.parentId ? 'comment_reply' : 'comment',
      entity_id: opts.postId,
      body: opts.body.slice(0, 120),
    })
  }
  return data as Comment
}

export async function deleteComment(commentId: string) {
  await supabase.from('comments').delete().eq('id', commentId)
}

// ---------- Stories ----------
export async function getActiveStories() {
  const { data } = await supabase
    .from('stories')
    .select(`*, profile:profiles!stories_user_id_fkey(*)`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return (data || []) as Story[]
}

export async function createStory(opts: { userId: string; url: string; caption?: string | null }) {
  const { data, error } = await supabase
    .from('stories')
    .insert({ user_id: opts.userId, url: opts.url, caption: opts.caption ?? null })
    .select('*')
    .maybeSingle()
  return { data: data as Story | null, error }
}

export async function markStoryViewed(storyId: string, userId: string) {
  await supabase.from('story_views').upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' })
}

export async function reactToStory(storyId: string, userId: string, emoji: string, storyOwnerId: string) {
  await supabase.from('story_reactions').insert({ story_id: storyId, user_id: userId, emoji })
  if (storyOwnerId !== userId) {
    await supabase.from('notifications').insert({
      user_id: storyOwnerId,
      actor_id: userId,
      type: 'story_reaction',
      entity_id: storyId,
      body: emoji,
    })
  }
}

// ---------- Reels ----------
export async function getReelsPage(cursor?: string, limit = 6) {
  let q = supabase
    .from('reels')
    .select(`*, profile:profiles!reels_user_id_fkey(*)`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (cursor) q = q.lt('created_at', cursor)
  const { data } = await q
  return { items: (data || []) as Reel[], nextCursor: (data && data.length === limit ? data[data.length - 1].created_at : null) as string | null }
}

export async function createReel(opts: { userId: string; url: string; caption?: string | null; audioName?: string | null }) {
  const { data, error } = await supabase
    .from('reels')
    .insert({ user_id: opts.userId, url: opts.url, caption: opts.caption ?? null, audio_name: opts.audioName ?? null })
    .select('*')
    .maybeSingle()
  return { data: data as Reel | null, error }
}

export async function toggleReelLike(reelId: string, userId: string, reelOwnerId: string) {
  const { data } = await supabase
    .from('reel_likes')
    .select('id')
    .eq('reel_id', reelId)
    .eq('user_id', userId)
    .maybeSingle()
  if (data) {
    await supabase.from('reel_likes').delete().eq('id', data.id)
    return false
  }
  await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: userId })
  if (reelOwnerId !== userId) {
    await supabase.from('notifications').insert({
      user_id: reelOwnerId,
      actor_id: userId,
      type: 'reel_like',
      entity_id: reelId,
    })
  }
  return true
}

export async function getReelComments(reelId: string) {
  const { data } = await supabase
    .from('comments_reels')
    .select(`*, profile:profiles!comments_reels_user_id_fkey(*)`)
    .eq('reel_id', reelId)
    .order('created_at', { ascending: true })
  return (data || []) as any[]
}

export async function addReelComment(opts: { reelId: string; userId: string; body: string; reelOwnerId: string }) {
  const { data, error } = await supabase
    .from('comments_reels')
    .insert({ reel_id: opts.reelId, user_id: opts.userId, body: opts.body })
    .select(`*, profile:profiles!comments_reels_user_id_fkey(*)`)
    .maybeSingle()
  if (error || !data) return null
  if (opts.reelOwnerId !== opts.userId) {
    await supabase.from('notifications').insert({
      user_id: opts.reelOwnerId,
      actor_id: opts.userId,
      type: 'comment',
      entity_id: opts.reelId,
      body: opts.body.slice(0, 120),
    })
  }
  return data
}

// ---------- Notifications ----------
export async function getNotifications(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select(`*, actor:profiles!notifications_actor_id_fkey(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)
  return (data || []) as Notification[]
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
}

// ---------- DMs ----------
export async function getOrCreateConversation(userA: string, userB: string) {
  // find existing conversation with both members
  const { data: myConvs } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userA)
  const convIds = (myConvs || []).map((m) => m.conversation_id)
  if (convIds.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userB)
      .in('conversation_id', convIds)
      .maybeSingle()
    if (shared) return shared.conversation_id as string
  }
  // create new
  const { data: conv } = await supabase.from('conversations').insert({}).select('*').maybeSingle()
  if (!conv) throw new Error('failed to create conversation')
  await supabase.from('conversation_members').insert([
    { conversation_id: conv.id, user_id: userA },
    { conversation_id: conv.id, user_id: userB },
  ])
  return conv.id as string
}

export async function getConversations(userId: string) {
  const { data: members } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId)
  const convIds = (members || []).map((m) => m.conversation_id)
  if (!convIds.length) return [] as Conversation[]

  const { data: allMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, profile:profiles!conversation_members_user_id_fkey(*)')
    .in('conversation_id', convIds)

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  const result: Conversation[] = convIds.map((cid) => {
    const other = (allMembers || []).find((m: any) => m.conversation_id === cid && m.user_id !== userId)
    const convMessages = (messages || []).filter((m: any) => m.conversation_id === cid)
    const last = convMessages[0]
    const unread = convMessages.filter((m: any) => m.sender_id !== userId && !m.seen).length
    return {
      id: cid,
      created_at: '',
      otherUser: other?.profile as Profile | undefined,
      lastMessage: last as Message | undefined,
      unread,
    }
  })
  result.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
    const tb = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
    return tb - ta
  })
  return result
}

export async function getMessages(conversationId: string) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return (data || []) as Message[]
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .maybeSingle()
  return { data: data as Message | null, error }
}

export async function markMessagesSeen(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ seen: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('seen', false)
}

// ---------- Storage uploads ----------
export async function uploadFile(bucket: string, file: File, pathPrefix: string) {
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) return { url: null, error }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return { url: pub.publicUrl, error: null }
}
