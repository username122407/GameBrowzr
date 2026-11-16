import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

const presets = [
  ['orbit', 'Astronaut'], ['pilot', 'Pilot'], ['mech', 'Mech'],
  ['duelist', 'Duelist'], ['night', 'Fox'], ['specter', 'Ranger'],
]
const bucket = 'gamebrowzr-avatars'
const objectPath = id => id + '/avatar.webp'
const limit = 5 * 1024 * 1024

export function Avatar({ client, user, className = '' }) {
  const choice = user?.user_metadata?.gamebrowzr_avatar
  const revision = user?.user_metadata?.gamebrowzr_avatar_revision
  const userId = user?.id
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (choice !== 'upload' || !client || !userId) return
    let active = true
    async function load() {
      try {
        const { data, error } = await client.storage.from(bucket).createSignedUrl(objectPath(userId), 3600)
        if (!error && active) setImage({ userId, revision, url: data.signedUrl })
      } catch { /* The default avatar covers network errors. */ }
    }
    void load()
    const timer = window.setInterval(load, 50 * 60 * 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [choice, client, revision, userId])

  const preset = presets.find(([id]) => id === choice) || presets[0]
  const showUpload = choice === 'upload' && image?.userId === userId && image.revision === revision
  return <span className={'gb-avatar ' + className} data-avatar={preset[0]} aria-hidden="true">
    {showUpload ? <img src={image.url} alt="" onError={() => setImage(null)} /> : null}
  </span>
}

async function prepareImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > limit || !file.size) {
    throw new Error('Choose a JPG, PNG, or WebP image up to 5 MB.')
  }
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error('Choose an image under 8,192 pixels per side.')
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88))
    if (!blob || blob.type !== 'image/webp') throw new Error('This browser could not prepare the image.')
    return blob
  } finally { bitmap.close() }
}

export default function AvatarPicker({ client, user }) {
  const choice = user.user_metadata?.gamebrowzr_avatar || 'orbit'
  const fileInput = useRef(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function save(id, file) {
    if (pending) return
    setPending(true)
    setMessage('')
    setError('')
    try {
      const data = { gamebrowzr_avatar: id }
      if (file) {
        const picture = await prepareImage(file)
        const result = await client.storage.from(bucket).upload(objectPath(user.id), picture, { upsert: true, contentType: 'image/webp', cacheControl: '0' })
        if (result.error) throw new Error('Upload failed. Check that avatar storage is configured and try again.')
        data.gamebrowzr_avatar_revision = crypto.randomUUID()
      }
      const result = await client.auth.updateUser({ data })
      if (result.error) throw new Error('Could not save your avatar. Try again.')
      setMessage('Profile picture updated.')
    } catch (issue) { setError(issue instanceof DOMException ? 'Could not open that image. Try another JPG, PNG, or WebP.' : issue.message) }
    finally { setPending(false) }
  }

  return <section className="gb-avatar-picker" aria-label="Profile picture" aria-busy={pending}>
    <Avatar client={client} user={user} className="gb-avatar-preview" />
    <button className="gb-avatar-upload" type="button" disabled={pending} aria-describedby="gb-avatar-help" onClick={() => fileInput.current?.click()}>
      <Upload size={17} aria-hidden="true" /> Upload photo
    </button>
    <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={event => {
      const file = event.currentTarget.files[0]
      event.currentTarget.value = ''
      if (file) void save('upload', file)
    }} />
    <p id="gb-avatar-help">JPG, PNG, or WebP up to 5 MB. Photos are square-cropped and private.</p>
    <fieldset className="gb-avatar-choices" disabled={pending}>
      <legend>Choose an avatar</legend>
      <div className="gb-avatar-options">
        {presets.map(([id, label]) => <button key={id} type="button" aria-label={label} aria-pressed={choice === id} onClick={() => save(id)}>
          <span className="gb-avatar" data-avatar={id} aria-hidden="true" /><span>{label}</span>
        </button>)}
      </div>
    </fieldset>
    <p className="gb-avatar-status" role="status">{pending ? 'Saving profile picture…' : message}</p>
    {error && <p role="alert">{error}</p>}
  </section>
}
