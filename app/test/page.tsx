// "use client"

// import type React from "react"

// import { useState, useEffect, useRef } from "react"
// import { Slider } from "./components/ui/slider"
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs"
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./components/ui/select"
// import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog"
// import { Textarea } from "./components/ui/textarea"
// import { Play, Pause, SkipForward } from "lucide-react";
// // Removed: import useSWR from 'swr'

// interface Track {
//   id: string
//   title: string
//   artist: string
//   genre: string
//   duration: number
//   url: string
//   file?: File
// }

// interface Playlist {
//   id: string
//   name: string
//   description: string
//   tracks: string[]
//   createdAt: Date
// }

// export default function MusicPlayer() {
//   const [tracks, setTracks] = useState<Track[]>([])
//   const [playlists, setPlaylists] = useState<Playlist[]>([])
//   const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
//   const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
//   const [isPlaying, setIsPlaying] = useState(false)
//   const [currentTime, setCurrentTime] = useState(0)
//   const [duration, setDuration] = useState(0)
//   const [volume, setVolume] = useState(1)
//   const [isMuted, setIsMuted] = useState(false)
//   const [searchQuery, setSearchQuery] = useState("")
//   const [genreFilter, setGenreFilter] = useState("all")
//   const [isShuffled, setIsShuffled] = useState(false)
//   const [isRepeating, setIsRepeating] = useState(false)
//   const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
//   const [newPlaylistName, setNewPlaylistName] = useState("")
//   const [newPlaylistDescription, setNewPlaylistDescription] = useState("")

//   const audioRef = useRef<HTMLAudioElement>(null)
//   const fileInputRef = useRef<HTMLInputElement>(null)

//   // Load data from localStorage on mount
//   useEffect(() => {
//     const savedTracks = localStorage.getItem("musicPlayerTracks")
//     const savedPlaylists = localStorage.getItem("musicPlayerPlaylists")

//     if (savedTracks) {
//       setTracks(JSON.parse(savedTracks))
//     }
//     if (savedPlaylists) {
//       setPlaylists(JSON.parse(savedPlaylists))
//     }
//   }, [])

//   // Save tracks to localStorage
//   useEffect(() => {
//     localStorage.setItem("musicPlayerTracks", JSON.stringify(tracks))
//   }, [tracks])

//   // Save playlists to localStorage
//   useEffect(() => {
//     localStorage.setItem("musicPlayerPlaylists", JSON.stringify(playlists))
//   }, [playlists])

//   // Audio event listeners
//   useEffect(() => {
//     const audio = audioRef.current
//     if (!audio) return

//     const updateTime = () => setCurrentTime(audio.currentTime)
//     const updateDuration = () => setDuration(audio.duration)
//     const handleEnded = () => {
//       if (isRepeating) {
//         audio.currentTime = 0
//         audio.play()
//       } else {
//         handleNext()
//       }
//     }

//     audio.addEventListener("timeupdate", updateTime)
//     audio.addEventListener("loadedmetadata", updateDuration)
//     audio.addEventListener("ended", handleEnded)

//     return () => {
//       audio.removeEventListener("timeupdate", updateTime)
//       audio.removeEventListener("loadedmetadata", updateDuration)
//       audio.removeEventListener("ended", handleEnded)
//     }
//   }, [currentTrack, isRepeating])

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files
//     if (!files) return

//     Array.from(files).forEach((file) => {
//       if (file.type.startsWith("audio/")) {
//         const url = URL.createObjectURL(file)
//         const audio = new Audio(url)

//         audio.addEventListener("loadedmetadata", () => {
//           const newTrack: Track = {
//             id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
//             title: file.name.replace(/\.[^/.]+$/, ""),
//             artist: "Unknown Artist",
//             genre: "Unknown",
//             duration: audio.duration,
//             url,
//             file,
//           }

//           setTracks((prev) => [...prev, newTrack])
//         })
//       }
//     })
//   }

//   const playTrack = (track: Track) => {
//     if (currentTrack?.id === track.id && isPlaying) {
//       setIsPlaying(false)
//       audioRef.current?.pause()
//     } else {
//       setCurrentTrack(track)
//       setIsPlaying(true)
//       if (audioRef.current) {
//         audioRef.current.src = track.url
//         audioRef.current.play()
//       }
//     }
//   }

//   const handlePlayPause = () => {
//     if (!currentTrack) return

//     if (isPlaying) {
//       audioRef.current?.pause()
//       setIsPlaying(false)
//     } else {
//       audioRef.current?.play()
//       setIsPlaying(true)
//     }
//   }

//   const handleNext = () => {
//     if (!currentTrack) return

//     const currentTracks = currentPlaylist ? tracks.filter((t) => currentPlaylist.tracks.includes(t.id)) : tracks

//     const currentIndex = currentTracks.findIndex((t) => t.id === currentTrack.id)
//     let nextIndex = currentIndex + 1

//     if (isShuffled) {
//       nextIndex = Math.floor(Math.random() * currentTracks.length)
//     } else if (nextIndex >= currentTracks.length) {
//       nextIndex = 0
//     }

//     const nextTrack = currentTracks[nextIndex]
//     if (nextTrack) {
//       playTrack(nextTrack)
//     }
//   }

//   const handlePrevious = () => {
//     if (!currentTrack) return

//     const currentTracks = currentPlaylist ? tracks.filter((t) => currentPlaylist.tracks.includes(t.id)) : tracks

//     const currentIndex = currentTracks.findIndex((t) => t.id === currentTrack.id)
//     let prevIndex = currentIndex - 1

//     if (prevIndex < 0) {
//       prevIndex = currentTracks.length - 1
//     }

//     const prevTrack = currentTracks[prevIndex]
//     if (prevTrack) {
//       playTrack(prevTrack)
//     }
//   }

//   const handleSeek = (value: number[]) => {
//     if (audioRef.current) {
//       audioRef.current.currentTime = value[0]
//       setCurrentTime(value[0])
//     }
//   }

//   const handleVolumeChange = (value: number[]) => {
//     const newVolume = value[0]
//     setVolume(newVolume)
//     if (audioRef.current) {
//       audioRef.current.volume = newVolume
//     }
//     setIsMuted(newVolume === 0)
//   }

//   const toggleMute = () => {
//     if (audioRef.current) {
//       if (isMuted) {
//         audioRef.current.volume = volume
//         setIsMuted(false)
//       } else {
//         audioRef.current.volume = 0
//         setIsMuted(true)
//       }
//     }
//   }

//   const createPlaylist = () => {
//     if (!newPlaylistName.trim()) return

//     const newPlaylist: Playlist = {
//       id: Date.now().toString(),
//       name: newPlaylistName,
//       description: newPlaylistDescription,
//       tracks: [],
//       createdAt: new Date(),
//     }

//     setPlaylists((prev) => [...prev, newPlaylist])
//     setNewPlaylistName("")
//     setNewPlaylistDescription("")
//     setShowCreatePlaylist(false)
//   }

//   const addToPlaylist = (playlistId: string, trackId: string) => {
//     setPlaylists((prev) =>
//       prev.map((playlist) =>
//         playlist.id === playlistId ? { ...playlist, tracks: [...playlist.tracks, trackId] } : playlist,
//       ),
//     )
//   }

//   const removeFromPlaylist = (playlistId: string, trackId: string) => {
//     setPlaylists((prev) =>
//       prev.map((playlist) =>
//         playlist.id === playlistId ? { ...playlist, tracks: playlist.tracks.filter((id) => id !== trackId) } : playlist,
//       ),
//     )
//   }

//   const deletePlaylist = (playlistId: string) => {
//     setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
//     if (currentPlaylist?.id === playlistId) {
//       setCurrentPlaylist(null)
//     }
//   }

//   const filteredTracks = tracks.filter((track) => {
//     const matchesSearch =
//       track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       track.artist.toLowerCase().includes(searchQuery.toLowerCase())
//     const matchesGenre = genreFilter === "all" || track.genre === genreFilter
//     return matchesSearch && matchesGenre
//   })

//   const genres = Array.from(new Set(tracks.map((track) => track.genre)))

//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60)
//     const seconds = Math.floor(time % 60)
//     return `${minutes}:${seconds.toString().padStart(2, "0")}`
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <div className="container mx-auto p-4 max-w-6xl">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center gap-2">
//             <h1 className="text-3xl font-bold">Music Player</h1>
//           </div>
//           <div className="flex items-center gap-2">
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept="audio/*"
//               multiple
//               onChange={handleFileUpload}
//               className="hidden"
//             />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Main Content */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Search and Filters */}
//             <div className="flex flex-col sm:flex-row gap-4">
//               <div className="relative flex-1">
//                 <input
//                   placeholder="Search tracks..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
//               <Select value={genreFilter} onValueChange={setGenreFilter}>
//                 <SelectTrigger className="w-full sm:w-48">
//                   <SelectValue placeholder="Filter by genre" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Genres</SelectItem>
//                   {genres.map((genre) => (
//                     <SelectItem key={genre} value={genre}>
//                       {genre}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Tabs for Library and Playlists */}
//             <Tabs defaultValue="library" className="w-full">
//               <TabsList className="grid w-full grid-cols-2">
//                 <TabsTrigger value="library">Music Library</TabsTrigger>
//                 <TabsTrigger value="playlists">Playlists</TabsTrigger>
//               </TabsList>

//               <TabsContent value="library" className="space-y-4">
//                 <div className="space-y-2">
//                   {filteredTracks.map((track) => (
//                     <div
//                       key={track.id}
//                       className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
//                         currentTrack?.id === track.id ? "bg-accent border-primary" : ""
//                       }`}
//                       onClick={() => playTrack(track)}
//                     >
//                       <div className="flex items-center gap-3">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation()
//                             playTrack(track)
//                           }}
//                         >
//                           {currentTrack?.id === track.id && isPlaying ? (
//                             <Pause className="h-4 w-4" />
//                           ) : (
//                             <Play className="h-4 w-4" />
//                           )}
//                         </button>
//                         <div>
//                           <p className="font-medium">{track.title}</p>
//                           <p className="text-sm text-muted-foreground">{track.artist}</p>
//                         </div>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="text-sm text-muted-foreground">{formatTime(track.duration)}</span>
//                       </div>
//                     </div>
//                   ))}
//                   {filteredTracks.length === 0 && (
//                     <div className="text-center py-8 text-muted-foreground">
//                       {tracks.length === 0 ? "No music uploaded yet" : "No tracks match your search"}
//                     </div>
//                   )}
//                 </div>
//               </TabsContent>

//               <TabsContent value="playlists" className="space-y-4">
//                 <div className="flex justify-between items-center">
//                   <h3 className="text-lg font-semibold">Your Playlists</h3>
//                   <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
//                     <DialogTrigger asChild>
//                       <button>
//                         Create Playlist
//                       </button>
//                     </DialogTrigger>
//                     <DialogContent>
//                       <DialogHeader>
//                         <DialogTitle>Create New Playlist</DialogTitle>
//                       </DialogHeader>
//                       <div className="space-y-4">
//                         <div>
//                           <label htmlFor="playlist-name">Playlist Name</label>
//                           <input
//                             id="playlist-name"
//                             value={newPlaylistName}
//                             onChange={(e) => setNewPlaylistName(e.target.value)}
//                             placeholder="Enter playlist name"
//                           />
//                         </div>
//                         <div>
//                           <label htmlFor="playlist-description">Description (optional)</label>
//                           <Textarea
//                             id="playlist-description"
//                             value={newPlaylistDescription}
//                             onChange={(e) => setNewPlaylistDescription(e.target.value)}
//                             placeholder="Enter playlist description"
//                           />
//                         </div>
//                         <button onClick={createPlaylist} className="w-full">
//                           Create Playlist
//                         </button>
//                       </div>
//                     </DialogContent>
//                   </Dialog>
//                 </div>

//                 <div className="grid gap-4">
//                   {playlists.map((playlist) => (
//                     <div key={playlist.id}>
//                       <div className="flex justify-between items-start">
//                         <div>
//                           <h3 className="text-lg">{playlist.name}</h3>
//                           {playlist.description && (
//                             <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
//                           )}
//                           <p className="text-sm text-muted-foreground mt-1">{playlist.tracks.length} tracks</p>
//                         </div>
//                         <div className="flex gap-2">
//                           <button onClick={() => setCurrentPlaylist(playlist)}>
//                             Play
//                           </button>
//                           <button onClick={() => deletePlaylist(playlist.id)}>
//                             Delete
//                           </button>
//                         </div>
//                       </div>
//                       <div className="space-y-2">
//                         {playlist.tracks.map((trackId) => {
//                           const track = tracks.find((t) => t.id === trackId)
//                           if (!track) return null
//                           return (
//                             <div key={trackId} className="flex items-center justify-between p-2 rounded border">
//                               <div className="flex items-center gap-2">
//                                 <button onClick={() => playTrack(track)}>
//                                   <Play className="h-3 w-3" />
//                                 </button>
//                                 <div>
//                                   <p className="text-sm font-medium">{track.title}</p>
//                                   <p className="text-xs text-muted-foreground">{track.artist}</p>
//                                 </div>
//                               </div>
//                               <button
//                                 onClick={() => removeFromPlaylist(playlist.id, trackId)}
//                               >
//                                 Delete
//                               </button>
//                             </div>
//                           )
//                         })}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </TabsContent>
//             </Tabs>
//           </div>

//           {/* Player Sidebar */}
//           <div className="space-y-6">
//             {/* Now Playing */}
//             <div className="space-y-4">
//               {currentTrack ? (
//                 <>
//                   <div className="text-center">
//                     <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center mb-4">
//                       <Play className="h-16 w-16 text-primary" />
//                     </div>
//                     <h3 className="font-semibold">{currentTrack.title}</h3>
//                     <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
//                     <span className="text-sm text-muted-foreground">{currentTrack.genre}</span>
//                   </div>

//                   {/* Progress Bar */}
//                   <div className="space-y-2">
//                     <Slider
//                       value={[currentTime]}
//                       max={duration || 100}
//                       step={1}
//                       onValueChange={handleSeek}
//                       className="w-full"
//                     />
//                     <div className="flex justify-between text-xs text-muted-foreground">
//                       <span>{formatTime(currentTime)}</span>
//                       <span>{formatTime(duration)}</span>
//                     </div>
//                   </div>

//                   {/* Controls */}
//                   <div className="flex items-center justify-center gap-2">
//                     <button
//                       onClick={() => setIsShuffled(!isShuffled)}
//                       className={isShuffled ? "bg-primary text-primary-foreground" : ""}
//                     >
//                       Shuffle
//                     </button>
//                     <button onClick={handlePrevious}>
//                       Prev
//                     </button>
//                     <button onClick={handlePlayPause}>
//                       {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
//                     </button>
//                     <button onClick={handleNext}>
//                       <SkipForward className="h-4 w-4" />
//                     </button>
//                     <button
//                       onClick={() => setIsRepeating(!isRepeating)}
//                       className={isRepeating ? "bg-primary text-primary-foreground" : ""}
//                     >
//                       Repeat
//                     </button>
//                   </div>

//                   {/* Volume Control */}
//                   <div className="flex items-center gap-2">
//                     <button onClick={toggleMute}>
//                       {isMuted || volume === 0 ? "Mute" : "Unmute"}
//                     </button>
//                     <Slider
//                       value={[isMuted ? 0 : volume]}
//                       max={1}
//                       step={0.1}
//                       onValueChange={handleVolumeChange}
//                       className="flex-1"
//                     />
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
//                   <p>No track selected</p>
//                   <p className="text-sm">Choose a song to start playing</p>
//                 </div>
//               )}
//             </div>

//             {/* Current Playlist Info */}
//             {currentPlaylist && (
//               <div className="space-y-2">
//                 <h3 className="text-sm">Playing from</h3>
//                 <div>
//                   <p className="font-medium">{currentPlaylist.name}</p>
//                   <p className="text-sm text-muted-foreground">{currentPlaylist.tracks.length} tracks</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Hidden Audio Element */}
//       <audio ref={audioRef} />
//     </div>
//   )
// }
