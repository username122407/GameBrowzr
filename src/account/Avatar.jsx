import { useEffect, useState } from 'react'
import { Upload, UserRound } from 'lucide-react'

const presets = [
  ['orbit', 'Astronaut'], ['pilot', 'Pilot'], ['mech', 'Mech'],
  ['duelist', 'Duelist'], ['night', 'Fox'], ['specter', 'Ranger'],
]
const bucket = 'gamebrowzr-avatars'
const objectPath = id => id + '/avatar.webp'
const limit = 15 * 1024 * 1024

let cachedPhoto

export function clearAvatarPhoto(client, userId) {
  if (!cachedPhoto || cachedPhoto.client !== client || cachedPhoto.userId !== userId) return
  if (cachedPhoto.url) URL.revokeObjectURL(cachedPhoto.url)
  cachedPhoto = undefined
}

function photoRecord(client, userId, revision) {
  return cachedPhoto && cachedPhoto.client === client && cachedPhoto.userId === userId &&
    cachedPhoto.revision === revision ? cachedPhoto : null
}

function replaceRecord(client, userId, revision, blob) {
  if (cachedPhoto?.url) URL.revokeObjectURL(cachedPhoto.url)
  const record = { client, userId, revision, url: blob ? URL.createObjectURL(blob) : null }
  cachedPhoto = record
  return record
}

function loadPhoto(client, userId, revision) {
  const previous = photoRecord(client, userId, revision)
  if (previous?.url) return Promise.resolve(previous.url)
  if (previous?.request) return previous.request
  const record = replaceRecord(client, userId, revision)
  record.request = (async () => {
    const { data, error } = await client.storage.from(bucket).download(objectPath(userId))
    if (error || !data) throw new Error('Could not load profile photo.')
    if (cachedPhoto !== record) return null
    record.url = URL.createObjectURL(data)
    return record.url
  })().finally(() => { record.request = null })
  return record.request
}

export function Avatar({ client, user, className = '' }) {
  const choice = user?.user_metadata?.gamebrowzr_avatar
  const revision = user?.user_metadata?.gamebrowzr_avatar_revision
  const userId = user?.id
  const [image, setImage] = useState(null)
  const currentRecord = photoRecord(client, userId, revision)

  useEffect(() => {
    if (choice !== 'upload' || !client || !userId) return
    let active = true
    loadPhoto(client, userId, revision).then(url => {
      if (active) setImage({ userId, revision, url })
    }).catch(() => {
      if (active) setImage({ userId, revision, url: null })
    })
    return () => { active = false }
  }, [choice, client, revision, userId])

  const preset = presets.find(([id]) => id === choice) || presets[0]
  const matchingImage = image?.userId === userId && image?.revision === revision ? image : null
  const url = matchingImage ? matchingImage.url : currentRecord?.url
  return <span className={'gb-avatar ' + className} data-avatar={choice === 'upload' ? 'upload' : preset[0]} aria-hidden="true">
    {choice === 'upload' && (url
      ? <img src={url} alt="" onError={() => setImage({ userId, revision, url: null })} />
      : <UserRound size={20} />)}
  </span>
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch { /* Try the browser's photo decoder. */ }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('This device cannot open that photo. Try exporting it as JPG or PNG.'))
      image.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}

async function prepareImage(file) {
  if (!file.size || file.size > limit) throw new Error('Choose a photo up to 15 MB.')
  const image = await decodeImage(file)
  try {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height || width > 8192 || height > 8192) throw new Error('Choose an image under 8,192 pixels per side.')
    const side = Math.min(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    canvas.getContext('2d').drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 256, 256)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88))
    if (!blob || blob.type !== 'image/webp') throw new Error('This browser could not save the photo as WebP. Try an updated browser.')
    return blob
  } finally { image.close?.() }
}

export default function AvatarPicker({ client, user }) {
  const choice = user.user_metadata?.gamebrowzr_avatar || 'orbit'
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
        replaceRecord(client, user.id, data.gamebrowzr_avatar_revision, picture)
      }
      const result = await client.auth.updateUser({ data })
      if (result.error) throw new Error('Could not save your avatar. Try again.')
      setMessage('Profile picture updated.')
    } catch (issue) { setError(issue instanceof DOMException ? 'Could not open that image. Try another JPG, PNG, or WebP.' : issue.message) }
    finally { setPending(false) }
  }

  return <section className="gb-avatar-picker" aria-label="Profile picture" aria-busy={pending}>
    <Avatar client={client} user={user} className="gb-avatar-preview" />
    <label className="gb-avatar-upload">
      <Upload size={17} aria-hidden="true" /> Upload photo
      <input type="file" accept="image/*" disabled={pending} aria-describedby="gb-avatar-help" onChange={event => {
        const file = event.currentTarget.files[0]
        event.currentTarget.value = ''
        if (file) void save('upload', file)
      }} />
    </label>
    <p id="gb-avatar-help">Choose a photo up to 15 MB. JPG, PNG, and WebP work on most devices. Photos stay private.</p>
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
