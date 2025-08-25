export interface Track {
  id: string
  title: string
  artist: string
  genre: string
  duration: number
  url: string
  file?: File
}

export interface Playlist {
  id: string
  name: string
  description: string
  tracks: string[]
  createdAt: Date
}


