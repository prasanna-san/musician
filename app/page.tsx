"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Slider } from "./components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./components/ui/select"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog"
import { Textarea } from "./components/ui/textarea"
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from "lucide-react";

interface Track {
  id: string
  title: string
  artist: string
  genre: string
  duration: number
  url: string
  file?: File
}

interface Playlist {
  id: string
  name: string
  description: string
  tracks: string[]
  createdAt: Date
}

export default function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [genreFilter, setGenreFilter] = useState("all")
  const [isShuffled, setIsShuffled] = useState(false)
  const [isRepeating, setIsRepeating] = useState(false)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")

  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTracks = localStorage.getItem("musicPlayerTracks")
    const savedPlaylists = localStorage.getItem("musicPlayerPlaylists")

    if (savedTracks) {
      setTracks(JSON.parse(savedTracks))
    }
    if (savedPlaylists) {
      setPlaylists(JSON.parse(savedPlaylists))
    }
  }, [])

  // Save tracks to localStorage
  useEffect(() => {
    localStorage.setItem("musicPlayerTracks", JSON.stringify(tracks))
  }, [tracks])

  // Save playlists to localStorage
  useEffect(() => {
    localStorage.setItem("musicPlayerPlaylists", JSON.stringify(playlists))
  }, [playlists])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (isRepeating) {
        audio.currentTime = 0
        audio.play()
      } else {
        handleNext()
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [currentTrack, isRepeating])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("audio/")) {
        const url = URL.createObjectURL(file)
        const audio = new Audio(url)

        audio.addEventListener("loadedmetadata", () => {
          const newTrack: Track = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            genre: "Unknown",
            duration: audio.duration,
            url,
            file,
          }
        
          setTracks((prev) => [...prev, newTrack])
        })
      }
    })
  }

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      setIsPlaying(false)
      audioRef.current?.pause()
    } else {
      setCurrentTrack(track)
      setIsPlaying(true)
      if (audioRef.current) {
        audioRef.current.src = track.url
        audioRef.current.play()
      }
    }
  }

  const handlePlayPause = () => {
    if (!currentTrack) return

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      audioRef.current?.play()
      setIsPlaying(true)
    }
  }

  const handleNext = () => {
    if (!currentTrack) return

    const currentTracks = currentPlaylist ? tracks.filter((t) => currentPlaylist.tracks.includes(t.id)) : tracks

    const currentIndex = currentTracks.findIndex((t) => t.id === currentTrack.id)
    let nextIndex = currentIndex + 1

    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * currentTracks.length)
    } else if (nextIndex >= currentTracks.length) {
      nextIndex = 0
    }

    const nextTrack = currentTracks[nextIndex]
    if (nextTrack) {
      playTrack(nextTrack)
    }
  }

  const handlePrevious = () => {
    if (!currentTrack) return

    const currentTracks = currentPlaylist ? tracks.filter((t) => currentPlaylist.tracks.includes(t.id)) : tracks

    const currentIndex = currentTracks.findIndex((t) => t.id === currentTrack.id)
    let prevIndex = currentIndex - 1

    if (prevIndex < 0) {
      prevIndex = currentTracks.length - 1
    }

    const prevTrack = currentTracks[prevIndex]
    if (prevTrack) {
      playTrack(prevTrack)
    }
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      description: newPlaylistDescription,
      tracks: [],
      createdAt: new Date(),
    }

    setPlaylists((prev) => [...prev, newPlaylist])
    setNewPlaylistName("")
    setNewPlaylistDescription("")
    setShowCreatePlaylist(false)
  }

  const addToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, tracks: [...playlist.tracks, trackId] } : playlist,
      ),
    )
  }

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, tracks: playlist.tracks.filter((id) => id !== trackId) } : playlist,
      ),
    )
  }

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(null)
    }
  }

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = genreFilter === "all" || track.genre === genreFilter
    return matchesSearch && matchesGenre
  })

  const genres = Array.from(new Set(tracks.map((track) => track.genre)))

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (


<div className="min-h-screen bg-background text-foreground">
  <div className="container mx-auto p-4 max-w-6xl">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-primary">Player Logo</h1>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
  className="px-8 py-3 bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/80 border-t-white/90 border-l-white/90 hover:scale-105 active:scale-95"
  onClick={() => fileInputRef.current && fileInputRef.current.click()}
>
  Upload
</button>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-2 py-2 border rounded-2xl w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-full sm:w-48 border rounded-2xl">
              <SelectValue placeholder="Filter by genre" />
            </SelectTrigger>
            <SelectContent className="border rounded-2xl shadow-md">
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for Library and Playlists */}
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border rounded-2xl overflow-hidden">
            <TabsTrigger
              value="library"
              className="py-2 hover:bg-accent transition-all"
            >
              Music Library
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="py-2 hover:bg-accent transition-all"
            >
              Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="space-y-2">
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border hover:shadow-md transition-all cursor-pointer ${
                    currentTrack?.id === track.id ? "bg-accent border-primary" : "bg-card"
                  }`}
                  onClick={() => playTrack(track)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track);
                      }}
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <p className="font-medium text-lg">{track.title}</p>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(track.duration)}
                  </span>
                </div>
              ))}
              {filteredTracks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {tracks.length === 0 ? "No music uploaded yet" : "No tracks match your search"}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Playlists</h3>
              <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
                <DialogTrigger asChild>
                  <button className="border rounded-2xl px-3 py-1 hover:bg-accent transition-all">Create Playlist</button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="playlist-name">Playlist Name</label>
                      <input
                        id="playlist-name"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Enter playlist name"
                        className="border rounded-2xl p-2 w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="playlist-description">Description (optional)</label>
                      <Textarea
                        id="playlist-description"
                        value={newPlaylistDescription}
                        onChange={(e) => setNewPlaylistDescription(e.target.value)}
                        placeholder="Enter playlist description"
                        className="rounded-2xl"
                      />
                    </div>
                    <button onClick={createPlaylist} className="w-full border rounded-2xl px-3 py-1 hover:bg-accent">
                      Create Playlist
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="border rounded-2xl p-4 hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{playlist.name}</h3>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">{playlist.tracks.length} tracks</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="border rounded-2xl px-2 py-1 hover:bg-accent" onClick={() => setCurrentPlaylist(playlist)}>
                        Play
                      </button>
                      <button className="border rounded-2xl px-2 py-1 hover:bg-destructive/10" onClick={() => deletePlaylist(playlist.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2">
                    {playlist.tracks.map((trackId) => {
                      const track = tracks.find((t) => t.id === trackId);
                      if (!track) return null;
                      return (
                        <div key={trackId} className="flex items-center justify-between p-2 rounded-2xl border">
                          <div className="flex items-center gap-2">
                            <button className="border rounded-2xl px-2 py-1 hover:bg-accent" onClick={() => playTrack(track)}>
                              <Play className="h-3 w-3" />
                            </button>
                            <div>
                              <p className="text-sm font-medium">{track.title}</p>
                              <p className="text-xs text-muted-foreground">{track.artist}</p>
                            </div>
                          </div>
                          <button className="border rounded-2xl px-2 py-1 hover:bg-destructive/10" onClick={() => removeFromPlaylist(playlist.id, trackId)}>
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Player Sidebar */}
      {/* <div className="space-y-6">
        <div className="space-y-4 border rounded-2xl p-4">
          {currentTrack ? (
            <>
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-2xl flex items-center justify-center mb-4">
                  <Play className="h-16 w-16 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{currentTrack.title}</h3>
                <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
                <span className="text-sm text-muted-foreground">{currentTrack.genre}</span>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={`border rounded-2xl px-2 py-1 ${
                    isShuffled ? "bg-primary text-white" : "hover:bg-accent"
                  }`}
                >
                  Shuffle
                </button>
                <button onClick={handlePrevious} className="border rounded-2xl px-2 py-1 hover:bg-accent">
                  Prev
                </button>
                <button onClick={handlePlayPause} className="border rounded-2xl px-2 py-1 hover:bg-accent">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button onClick={handleNext} className="border rounded-2xl px-2 py-1 hover:bg-accent">
                  <SkipForward className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsRepeating(!isRepeating)}
                  className={`border rounded-2xl px-2 py-1 ${
                    isRepeating ? "bg-primary text-white" : "hover:bg-accent"
                  }`}
                >
                  Repeat
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="border rounded-2xl px-2 py-1 hover:bg-accent">
                  {isMuted || volume === 0 ? "Mute" : "Unmute"}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No track selected</p>
              <p className="text-sm">Choose a song to start playing</p>
            </div>
          )}
        </div>

        {currentPlaylist && (
          <div className="space-y-2 border rounded-2xl p-4">
            <h3 className="text-sm">Playing from</h3>
            <div>
              <p className="font-medium">{currentPlaylist.name}</p>
              <p className="text-sm text-muted-foreground">{currentPlaylist.tracks.length} tracks</p>
            </div>
          </div>
        )}
      </div> */}

<div className="space-y-6">
  <div className="space-y-4 p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
    {currentTrack ? (
      <>
        <div className="text-center">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/30 to-primary/50 rounded-xl flex items-center justify-center mb-4 shadow-inner">
            <Play className="h-16 w-16 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-white">{currentTrack.title}</h3>
          <p className="text-sm text-zinc-300">{currentTrack.artist}</p>
          <span className="text-sm text-zinc-400">{currentTrack.genre}</span>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full [&>*]:h-2 [&>*]:bg-zinc-700 [&>div]:bg-primary"
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
  <button
    onClick={() => setIsShuffled(!isShuffled)}
    className={`p-2 rounded-xl transition-all duration-200 border border-zinc-700 shadow ${
      isShuffled
        ? "bg-primary text-white hover:scale-105 active:scale-95"
        : "bg-zinc-800 text-white hover:bg-zinc-700 hover:scale-105 active:scale-95"
    }`}
  >
    <Shuffle className="h-5 w-5" />
  </button>

  <button
    onClick={handlePrevious}
    className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200"
  >
    <SkipBack className="h-5 w-5" />
  </button>

  <button
    onClick={handlePlayPause}
    className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200"
  >
    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
  </button>

  <button
    onClick={handleNext}
    className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200"
  >
    <SkipForward className="h-5 w-5" />
  </button>

  <button
    onClick={() => setIsRepeating(!isRepeating)}
    className={`p-2 rounded-xl transition-all duration-200 border border-zinc-700 shadow ${
      isRepeating
        ? "bg-primary text-white hover:scale-105 active:scale-95"
        : "bg-zinc-800 text-white hover:bg-zinc-700 hover:scale-105 active:scale-95"
    }`}
  >
    <Repeat className="h-5 w-5" />
  </button>
</div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {isMuted || volume === 0 ? "Mute" : "Unmute"}
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="flex-1 [&>*]:h-2 [&>*]:bg-zinc-700 [&>div]:bg-primary"
          />
        </div>
      </>
    ) : (
      <div className="text-center py-8 text-zinc-400">
        <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>No track selected</p>
        <p className="text-sm">Choose a song to start playing</p>
      </div>
    )}
  </div>

  {currentPlaylist && (
    <div className="space-y-2 p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg">
      <h3 className="text-sm text-zinc-400">Playing from</h3>
      <div>
        <p className="font-medium text-white">{currentPlaylist.name}</p>
        <p className="text-sm text-zinc-400">
          {currentPlaylist.tracks.length} tracks
        </p>
      </div>
    </div>
  )}
</div>





    </div>
  </div>
  <audio ref={audioRef} />
</div>





// {/* <div className="min-h-screen bg-background text-foreground">
//   <div className="container mx-auto p-4 max-w-6xl">
//     {/* Header */}
//     <div className="flex items-center justify-between mb-6 border-b pb-4">
//       <h1 className="text-3xl font-bold text-primary">Music Player</h1>
//       <div className="flex items-center gap-2">
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="audio/*"
//           multiple
//           onChange={handleFileUpload}
//           className="hidden"
//         />
//       </div>
//     </div>

//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//       {/* Main Content */}
//       <div className="lg:col-span-2 space-y-6">
//         {/* Search and Filters */}
//         <div className="flex flex-col sm:flex-row gap-4">
//           <div className="relative flex-1">
//             <input
//               placeholder="Search tracks..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-4 pr-2 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary"
//             />
//           </div>
//           <Select value={genreFilter} onValueChange={setGenreFilter}>
//             <SelectTrigger className="w-full sm:w-48 border rounded-lg">
//               <SelectValue placeholder="Filter by genre" />
//             </SelectTrigger>
//             <SelectContent className="border rounded-md shadow-md">
//               <SelectItem value="all">All Genres</SelectItem>
//               {genres.map((genre) => (
//                 <SelectItem key={genre} value={genre}>
//                   {genre}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Tabs for Library and Playlists */}
//         <Tabs defaultValue="library" className="w-full">
//           <TabsList className="grid w-full grid-cols-2 border rounded-lg overflow-hidden">
//             <TabsTrigger
//               value="library"
//               className="py-2 hover:bg-accent transition-all"
//             >
//               Music Library
//             </TabsTrigger>
//             <TabsTrigger
//               value="playlists"
//               className="py-2 hover:bg-accent transition-all"
//             >
//               Playlists
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="library" className="space-y-4">
//             <div className="space-y-2">
//               {filteredTracks.map((track) => (
//                 <div
//                   key={track.id}
//                   className={`flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer ${
//                     currentTrack?.id === track.id ? "bg-accent border-primary" : "bg-card"
//                   }`}
//                   onClick={() => playTrack(track)}
//                 >
//                   <div className="flex items-center gap-3">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         playTrack(track);
//                       }}
//                     >
//                       {currentTrack?.id === track.id && isPlaying ? (
//                         <Pause className="h-4 w-4" />
//                       ) : (
//                         <Play className="h-4 w-4" />
//                       )}
//                     </button>
//                     <div>
//                       <p className="font-medium text-lg">{track.title}</p>
//                       <p className="text-sm text-muted-foreground">{track.artist}</p>
//                     </div>
//                   </div>
//                   <span className="text-sm text-muted-foreground">
//                     {formatTime(track.duration)}
//                   </span>
//                 </div>
//               ))}
//               {filteredTracks.length === 0 && (
//                 <div className="text-center py-8 text-muted-foreground">
//                   {tracks.length === 0 ? "No music uploaded yet" : "No tracks match your search"}
//                 </div>
//               )}
//             </div>
//           </TabsContent>

//           <TabsContent value="playlists" className="space-y-4">
//             <div className="flex justify-between items-center border-b pb-2">
//               <h3 className="text-lg font-semibold">Your Playlists</h3>
//               <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
//                 <DialogTrigger asChild>
//                   <button className="border rounded px-3 py-1 hover:bg-accent transition-all">Create Playlist</button>
//                 </DialogTrigger>
//                 <DialogContent className="rounded-xl shadow-xl">
//                   <DialogHeader>
//                     <DialogTitle>Create New Playlist</DialogTitle>
//                   </DialogHeader>
//                   <div className="space-y-4">
//                     <div>
//                       <label htmlFor="playlist-name">Playlist Name</label>
//                       <input
//                         id="playlist-name"
//                         value={newPlaylistName}
//                         onChange={(e) => setNewPlaylistName(e.target.value)}
//                         placeholder="Enter playlist name"
//                         className="border rounded p-2 w-full"
//                       />
//                     </div>
//                     <div>
//                       <label htmlFor="playlist-description">Description (optional)</label>
//                       <Textarea
//                         id="playlist-description"
//                         value={newPlaylistDescription}
//                         onChange={(e) => setNewPlaylistDescription(e.target.value)}
//                         placeholder="Enter playlist description"
//                       />
//                     </div>
//                     <button onClick={createPlaylist} className="w-full border rounded px-3 py-1 hover:bg-accent">
//                       Create Playlist
//                     </button>
//                   </div>
//                 </DialogContent>
//               </Dialog>
//             </div>

//             <div className="grid gap-4">
//               {playlists.map((playlist) => (
//                 <div key={playlist.id} className="border rounded p-4 hover:shadow-md">
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h3 className="text-lg font-semibold">{playlist.name}</h3>
//                       {playlist.description && (
//                         <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
//                       )}
//                       <p className="text-sm text-muted-foreground mt-1">{playlist.tracks.length} tracks</p>
//                     </div>
//                     <div className="flex gap-2">
//                       <button className="border rounded px-2 py-1 hover:bg-accent" onClick={() => setCurrentPlaylist(playlist)}>
//                         Play
//                       </button>
//                       <button className="border rounded px-2 py-1 hover:bg-destructive/10" onClick={() => deletePlaylist(playlist.id)}>
//                         Delete
//                       </button>
//                     </div>
//                   </div>

//                   <div className="space-y-2 mt-2">
//                     {playlist.tracks.map((trackId) => {
//                       const track = tracks.find((t) => t.id === trackId);
//                       if (!track) return null;
//                       return (
//                         <div key={trackId} className="flex items-center justify-between p-2 rounded border">
//                           <div className="flex items-center gap-2">
//                             <button className="border rounded px-2 py-1 hover:bg-accent" onClick={() => playTrack(track)}>
//                               <Play className="h-3 w-3" />
//                             </button>
//                             <div>
//                               <p className="text-sm font-medium">{track.title}</p>
//                               <p className="text-xs text-muted-foreground">{track.artist}</p>
//                             </div>
//                           </div>
//                           <button className="border rounded px-2 py-1 hover:bg-destructive/10" onClick={() => removeFromPlaylist(playlist.id, trackId)}>
//                             Delete
//                           </button>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </TabsContent>
//         </Tabs>
//       </div>

//       {/* Player Sidebar */}
//       <div className="space-y-6">
//         {/* Now Playing */}
//         <div className="space-y-4 border rounded p-4">
//           {currentTrack ? (
//             <>
//               <div className="text-center">
//                 <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center mb-4">
//                   <Play className="h-16 w-16 text-primary" />
//                 </div>
//                 <h3 className="font-semibold text-lg">{currentTrack.title}</h3>
//                 <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
//                 <span className="text-sm text-muted-foreground">{currentTrack.genre}</span>
//               </div>

//               <div className="space-y-2">
//                 <Slider
//                   value={[currentTime]}
//                   max={duration || 100}
//                   step={1}
//                   onValueChange={handleSeek}
//                   className="w-full"
//                 />
//                 <div className="flex justify-between text-xs text-muted-foreground">
//                   <span>{formatTime(currentTime)}</span>
//                   <span>{formatTime(duration)}</span>
//                 </div>
//               </div>

//               <div className="flex items-center justify-center gap-2">
//                 <button
//                   onClick={() => setIsShuffled(!isShuffled)}
//                   className={`border rounded px-2 py-1 ${
//                     isShuffled ? "bg-primary text-white" : "hover:bg-accent"
//                   }`}
//                 >
//                   Shuffle
//                 </button>
//                 <button onClick={handlePrevious} className="border rounded px-2 py-1 hover:bg-accent">
//                   Prev
//                 </button>
//                 <button onClick={handlePlayPause} className="border rounded px-2 py-1 hover:bg-accent">
//                   {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
//                 </button>
//                 <button onClick={handleNext} className="border rounded px-2 py-1 hover:bg-accent">
//                   <SkipForward className="h-4 w-4" />
//                 </button>
//                 <button
//                   onClick={() => setIsRepeating(!isRepeating)}
//                   className={`border rounded px-2 py-1 ${
//                     isRepeating ? "bg-primary text-white" : "hover:bg-accent"
//                   }`}
//                 >
//                   Repeat
//                 </button>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button onClick={toggleMute} className="border rounded px-2 py-1 hover:bg-accent">
//                   {isMuted || volume === 0 ? "Mute" : "Unmute"}
//                 </button>
//                 <Slider
//                   value={[isMuted ? 0 : volume]}
//                   max={1}
//                   step={0.1}
//                   onValueChange={handleVolumeChange}
//                   className="flex-1"
//                 />
//               </div>
//             </>
//           ) : (
//             <div className="text-center py-8 text-muted-foreground">
//               <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
//               <p>No track selected</p>
//               <p className="text-sm">Choose a song to start playing</p>
//             </div>
//           )}
//         </div>

//         {currentPlaylist && (
//           <div className="space-y-2 border rounded p-4">
//             <h3 className="text-sm">Playing from</h3>
//             <div>
//               <p className="font-medium">{currentPlaylist.name}</p>
//               <p className="text-sm text-muted-foreground">{currentPlaylist.tracks.length} tracks</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   </div>
//   <audio ref={audioRef} />
// </div>  */}








  )
}
