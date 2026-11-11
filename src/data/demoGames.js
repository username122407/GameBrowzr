// Sample records keep the interface usable before a RAWG API key is configured.
// These are illustrative demo entries, not live store availability or current prices.
export const demoGames = [
  {
    id: 'demo-1', name: 'Horizon Forbidden West', background_image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900',
    released: '2022-02-18', rating: 4.6, metacritic: 88, genres: [{ name: 'Action' }, { name: 'Adventure' }],
    parent_platforms: [{ platform: { name: 'PC' } }, { platform: { name: 'PlayStation' } }],
    short_screenshots: [], esrb_rating: { name: 'Teen' }
  },
  {
    id: 'demo-2', name: 'Stardew Valley', background_image: 'https://images.unsplash.com/photo-1493711662062-fa541dadf2fc?w=900',
    released: '2016-02-26', rating: 4.8, metacritic: 89, genres: [{ name: 'Indie' }, { name: 'Simulation' }],
    parent_platforms: [{ platform: { name: 'PC' } }, { platform: { name: 'PlayStation' } }, { platform: { name: 'Xbox' } }, { platform: { name: 'Nintendo' } }, { platform: { name: 'iOS' } }, { platform: { name: 'Android' } }],
    short_screenshots: [], esrb_rating: { name: 'Everyone 10+' }
  },
  {
    id: 'demo-3', name: 'Forza Horizon 5', background_image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900',
    released: '2021-11-09', rating: 4.5, metacritic: 92, genres: [{ name: 'Racing' }, { name: 'Sports' }],
    parent_platforms: [{ platform: { name: 'PC' } }, { platform: { name: 'Xbox' } }],
    short_screenshots: [], esrb_rating: { name: 'Everyone' }
  },
  {
    id: 'demo-4', name: 'The Legend of Zelda: Breath of the Wild', background_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900',
    released: '2017-03-03', rating: 4.8, metacritic: 97, genres: [{ name: 'Adventure' }, { name: 'Action' }],
    parent_platforms: [{ platform: { name: 'Nintendo' } }],
    short_screenshots: [], esrb_rating: { name: 'Everyone 10+' }
  },
  {
    id: 'demo-5', name: 'Minecraft', background_image: 'https://images.unsplash.com/photo-1607513746994-51f730a44832?w=900',
    released: '2011-11-18', rating: 4.4, metacritic: 78, genres: [{ name: 'Adventure' }, { name: 'Simulation' }],
    parent_platforms: [{ platform: { name: 'PC' } }, { platform: { name: 'PlayStation' } }, { platform: { name: 'Xbox' } }, { platform: { name: 'Nintendo' } }, { platform: { name: 'iOS' } }, { platform: { name: 'Android' } }],
    short_screenshots: [], esrb_rating: { name: 'Everyone 10+' }
  },
  {
    id: 'demo-6', name: 'Monument Valley', background_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900',
    released: '2014-04-03', rating: 4.4, metacritic: 89, genres: [{ name: 'Puzzle' }, { name: 'Indie' }],
    parent_platforms: [{ platform: { name: 'iOS' } }, { platform: { name: 'Android' } }],
    short_screenshots: [], esrb_rating: { name: 'Everyone' }
  }
].map(game => ({ ...game, metacritic: typeof game.metacritic === 'number' ? game.metacritic : null }))