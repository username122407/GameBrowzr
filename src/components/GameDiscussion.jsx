import { useEffect, useId, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useAccount } from '../account/AccountProvider.jsx'
import { Avatar } from '../account/Avatar.jsx'
import './gameDiscussion.css'

const pageSize = 20
const fields = 'id, author_id, author_name, body, created_at'
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function GameDiscussion({ gameId }) {
  const { client, user } = useAccount()
  const canPost = Boolean(user && !user.is_anonymous)
  const headingId = useId()
  const inputId = useId()
  const [comments, setComments] = useState([])
  const [avatars, setAvatars] = useState({})
  const [draft, setDraft] = useState('')
  const [limit, setLimit] = useState(pageSize)
  const [refresh, setRefresh] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!client) return
    const controller = new AbortController()
    setLoading(true)
    setLoadFailed(false)
    async function load() {
      try {
        const { data, error } = await client.from('gamebrowzr_comments')
          .select(fields).eq('game_id', gameId)
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .limit(limit + 1).abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (error) throw error
        setComments(data.slice(0, limit))
        setHasMore(data.length > limit)
        const authors = [...new Set(data.slice(0, limit).map(comment => comment.author_id))]
        if (authors.length) {
          void loadAvatars(authors)
        }
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    async function loadAvatars(authors) {
      try {
        const { data, error } = await client.rpc('gamebrowzr_discussion_avatars', {
          target_game: gameId, authors,
        }).abortSignal(controller.signal)
        if (!controller.signal.aborted && !error) {
          setAvatars(Object.fromEntries(data.map(row => [row.author_id, row.avatar])))
        }
      } catch {
        // Comments remain readable with the default avatar.
      }
    }
    void load()
    return () => controller.abort()
  }, [client, gameId, limit, refresh])

  async function mutate(action, success, failure) {
    setPending(true)
    setFeedback('')
    setStatus('')
    try {
      const { error } = await action()
      if (error) throw error
      success()
      setRefresh(value => value + 1)
    } catch {
      setFeedback(failure)
    } finally {
      setPending(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!canPost || pending || !body || body.length > 1000) return
    void mutate(
      () => client.from('gamebrowzr_comments').insert({ game_id: gameId, body }),
      () => { setDraft(''); setStatus('Comment posted.') },
      'Your comment could not be posted. Please try again.',
    )
  }

  function remove(id) {
    if (pending || !window.confirm('Delete this comment?')) return
    void mutate(
      () => client.from('gamebrowzr_comments').delete().eq('id', id).eq('game_id', gameId).select('id').single(),
      () => { setComments(items => items.filter(item => item.id !== id)); setStatus('Comment deleted.') },
      'This comment could not be deleted. Please try again.',
    )
  }

  return <section className="gb-discussion" aria-labelledby={headingId}>
    <div className="section-heading"><MessageSquare size={17} aria-hidden="true" /><h3 id={headingId}>Game discussion</h3></div>
    {!client ? <p>Discussions are currently unavailable.</p> : <>
      {canPost ? <form onSubmit={submit}>
        <label htmlFor={inputId}>Write a comment</label>
        <textarea id={inputId} rows={3} maxLength={1000} value={draft} readOnly={pending}
          onChange={event => setDraft(event.target.value)} required />
        <div className="gb-discussion-actions">
          <span>Public · 1,000 characters max</span>
          <button type="submit" className="primary-button" disabled={pending || !draft.trim()}>Post comment</button>
        </div>
      </form> : <p><a href="#/login">Log in</a> to join the discussion.</p>}
      {feedback && <p role="alert">{feedback}</p>}
      {status && <p role="status">{status}</p>}
      {loading && <p role="status">Loading comments…</p>}
      {loadFailed && <p role="alert">Comments could not be loaded. <button type="button" className="secondary-button" onClick={() => setRefresh(value => value + 1)}>Try again</button></p>}
      {!loading && !loadFailed && comments.length === 0 && <p>Be the first to comment on this game.</p>}
      {comments.length > 0 && <ul className="gb-discussion-list">
        {comments.map(comment => <li key={comment.id}>
          <div className="gb-discussion-actions">
            <div className="gb-discussion-author">
              {user?.id === comment.author_id
                ? <Avatar client={client} user={user} />
                : <span className="gb-avatar" data-avatar={avatars[comment.author_id] || 'orbit'} aria-hidden="true" />}
              <div><strong>{comment.author_name}</strong> <time dateTime={comment.created_at}>{formatDate.format(new Date(comment.created_at))}</time></div>
            </div>
            {user?.id === comment.author_id && <button type="button" className="secondary-button" disabled={pending} onClick={() => remove(comment.id)}>Delete comment</button>}
          </div>
          <p>{comment.body}</p>
        </li>)}
      </ul>}
      {hasMore && <button type="button" className="secondary-button" disabled={loading || pending} onClick={() => setLimit(value => value + pageSize)}>Load older comments</button>}
    </>}
  </section>
}
