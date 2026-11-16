import AccountPage from '../account/AccountPage.jsx'
import { useAccount } from '../account/AccountProvider.jsx'
import { useCollections } from './useCollections.js'
import GuestImport from './GuestImport.jsx'

export default function CollectionAccount() {
  const { client, user } = useAccount()
  const collections = useCollections(client, user.id)
  return <AccountPage mode="account" collections={collections}>
    <GuestImport collections={collections} />
  </AccountPage>
}

