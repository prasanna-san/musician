"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Slider } from "./components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./components/ui/select"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog"
import { Textarea } from "./components/ui/textarea"
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, MoreVertical } from "lucide-react";
import { Track, Playlist } from "./lib/types"
import HeaderUpload from "./components/HeaderUpload"
import SearchFilters from "./components/SearchFilters"

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
  // iTunes Search integration
  const [apiSearch, setApiSearch] = useState("")
  const [apiLoading, setApiLoading] = useState(false)
  const [apiResults, setApiResults] = useState<any[]>([])
  const [selectedApiIds, setSelectedApiIds] = useState<Set<string>>(new Set())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  // header upload moved into HeaderUpload component
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!isSearchOpen) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleDocClick = (event: MouseEvent | TouchEvent) => {
      if (!openMenuTrackId) return
      const target = event.target as HTMLElement | null
      if (!target) {
        setOpenMenuTrackId(null)
        return
      }
      const withinMenu = target.closest(`[data-track-id="${openMenuTrackId}"][data-track-menu]`)
      const withinButton = target.closest(`[data-track-id="${openMenuTrackId}"][data-track-menu-btn]`)
      if (withinMenu || withinButton) return
      setOpenMenuTrackId(null)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuTrackId(null)
    }
    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('touchstart', handleDocClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      document.removeEventListener('touchstart', handleDocClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openMenuTrackId])

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

  const searchItunes = async () => {
    const term = apiSearch.trim()
    if (!term) return
    try {
      setApiLoading(true)
      setSelectedApiIds(new Set())
      const params = new URLSearchParams({ term, entity: "song", limit: "25" })
      const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`)
      if (!res.ok) throw new Error("Failed fetching iTunes API")
      const data = await res.json()
      setApiResults(Array.isArray(data.results) ? data.results : [])
    } catch (e) {
      console.error(e)
      setApiResults([])
    } finally {
      setApiLoading(false)
    }
  }

  const toggleSelectApi = (id: string) => {
    setSelectedApiIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const importSelectedFromApi = () => {
    if (selectedApiIds.size === 0) return
    const mapped: Track[] = []
    for (const item of apiResults) {
      const rawId = String(item.trackId ?? item.collectionId ?? `${item.artistName}-${item.trackName}`)
      const id = `itunes_${rawId}`
      if (!selectedApiIds.has(id)) continue
      if (!item.previewUrl) continue
      const durationSec = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30
      mapped.push({
        id,
        title: item.trackName || "Unknown Title",
        artist: item.artistName || "Unknown Artist",
        genre: item.primaryGenreName || "Unknown",
        duration: durationSec,
        url: item.previewUrl,
      })
    }
    if (mapped.length === 0) return
    setTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id))
      const deduped = mapped.filter((t) => !existingIds.has(t.id))
      return deduped.length ? [...prev, ...deduped] : prev
    })
    setSelectedApiIds(new Set())
  }

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

  const deleteTrack = (trackId: string) => {
    const deleted = tracks.find((t) => t.id === trackId)
    setTracks((prev) => prev.filter((t) => t.id !== trackId))
    setPlaylists((prev) => prev.map((p) => ({ ...p, tracks: p.tracks.filter((id) => id !== trackId) })))
    if (currentTrack?.id === trackId) {
      audioRef.current?.pause()
      setIsPlaying(false)
      setCurrentTrack(null)
    }
    if (openMenuTrackId === trackId) setOpenMenuTrackId(null)
    if (deleted) {
      setToast({ type: "success", message: `${deleted.title} deleted` })
    }
  }

  // Function to delete multiple tracks at once
  const deleteMultipleTracks = (trackIds: string[]) => {
    trackIds.forEach(trackId => {
      deleteTrack(trackId)
    })
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
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist) return
    if (playlist.tracks.includes(trackId)) return
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, tracks: [...p.tracks, trackId] } : p)),
    )
    const track = tracks.find((t) => t.id === trackId)
    setToast({
      type: "success",
      message: `${track?.title || "Track"} added to ${playlist.name}`,
    })
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

  const playPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist)
    if (playlist.tracks.length > 0) {
      const firstTrack = tracks.find((t) => t.id === playlist.tracks[0])
      if (firstTrack) {
        playTrack(firstTrack)
      }
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
    {toast && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999]">
        <div className={`px-4 py-2 rounded-2xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-300/30 text-emerald-100' : 'bg-red-500/20 border-red-300/30 text-red-100'} backdrop-blur-lg`}> 
          {toast.message}
        </div>
      </div>
    )}
    {/* Header */}
    <HeaderUpload onFilesSelected={handleFileUpload} />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Search and Filters */}
        {/* <SearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          genreFilter={genreFilter}
          setGenreFilter={setGenreFilter}
          genres={genres}
        /> */}

        {/* Online Music Search (iTunes) */}
        {/* <div className="space-y-3 border rounded-2xl p-4">
          <div className="flex gap-2">
            <input
              placeholder="Search online (iTunes: artist, song, album)"
              value={apiSearch}
              onChange={(e) => setApiSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchItunes() }}
              className="flex-1 pl-4 pr-2 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={searchItunes}
              className="border rounded-2xl px-3 py-2 hover:bg-accent"
            >
              {apiLoading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={importSelectedFromApi}
              disabled={selectedApiIds.size === 0}
              className={`border rounded-2xl px-3 py-2 ${selectedApiIds.size === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'}`}
            >
              Import selected
            </button>
          </div>
          {apiResults.length > 0 && (
            <div className="max-h-64 overflow-auto space-y-2">
              {apiResults.map((r) => {
                const rawId = String(r.trackId ?? r.collectionId ?? `${r.artistName}-${r.trackName}`)
                const id = `itunes_${rawId}`
                const isSelected = selectedApiIds.has(id)
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${isSelected ? 'bg-accent border-primary' : 'bg-card'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectApi(id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium text-sm">{r.trackName || r.collectionName}</p>
                        <p className="text-xs text-muted-foreground">{r.artistName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.primaryGenreName || 'Unknown'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {!apiLoading && apiResults.length === 0 && apiSearch && (
            <div className="text-sm text-muted-foreground">No results</div>
          )}
        </div> */}

<div className="space-y-4 p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg">
  <div className="flex gap-3 relative" ref={searchRef}>
    <input
      placeholder="Search online (iTunes: artist, song, album)"
      value={apiSearch}
      onChange={(e) => { setApiSearch(e.target.value); setIsSearchOpen(true) }}
      onFocus={() => setIsSearchOpen(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') { searchItunes(); setIsSearchOpen(true) } }}
      className="flex-1 pl-4 pr-2 py-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow focus:outline-none focus:ring-2 focus:ring-primary"
    />
    <button
      onClick={searchItunes}
      className="px-4 py-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      {apiLoading ? 'Searching...' : 'Search'}
    </button>
    <button
      onClick={importSelectedFromApi}
      disabled={selectedApiIds.size === 0}
      className={`px-4 py-2 rounded-xl border border-zinc-700 shadow transition-all duration-200 ${
        selectedApiIds.size === 0
          ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-white'
          : 'bg-primary text-white hover:scale-105 active:scale-95'
      }`}
    >
      Import selected
    </button>

    {isSearchOpen && apiSearch && (
      <div className="absolute left-0 right-0 top-12 z-30 rounded-xl border border-zinc-700 bg-zinc-900/80 backdrop-blur-md shadow-2xl max-h-72 overflow-auto p-2 space-y-2">
        {apiLoading ? (
          <div className="text-sm text-zinc-400 px-2 py-1">Searching...</div>
        ) : apiResults.length > 0 ? (
          apiResults.map((r) => {
            const rawId = String(r.trackId ?? r.collectionId ?? `${r.artistName}-${r.trackName}`)
            const id = `itunes_${rawId}`
            const isSelected = selectedApiIds.has(id)
            return (
              <div
                key={id}
                className={`flex items-center justify-between p-3 rounded-lg border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700/80'} transition`}
                onClick={(e) => { e.stopPropagation(); toggleSelectApi(id) }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectApi(id)}
                    className="h-4 w-4 accent-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-medium text-sm text-white">{r.trackName || r.collectionName}</p>
                    <p className="text-xs text-zinc-400">{r.artistName}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400">{r.primaryGenreName || 'Unknown'}</span>
              </div>
            )
          })
        ) : (
          <div className="text-sm text-zinc-400 px-2 py-1">No results</div>
        )}
      </div>
    )}
  </div>

  {apiResults.length > 0 && (
    <div className="max-h-64 overflow-auto space-y-2">
      {apiResults.map((r) => {
        const rawId = String(r.trackId ?? r.collectionId ?? `${r.artistName}-${r.trackName}`)
        const id = `itunes_${rawId}`
        const isSelected = selectedApiIds.has(id)
        return (
          <div
            key={id}
            className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all duration-200 ${
              isSelected
                ? 'bg-primary/20 border-primary'
                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelectApi(id)}
                className="h-4 w-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm text-white">
                  {r.trackName || r.collectionName}
                </p>
                <p className="text-xs text-zinc-400">{r.artistName}</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400">
              {r.primaryGenreName || 'Unknown'}
            </span>
          </div>
        )
      })}
    </div>
  )}

  {!apiLoading && apiResults.length === 0 && apiSearch && (
    <div className="text-sm text-zinc-500 text-center">No results found</div>
  )}
</div>


        {/* Tabs for Library and Playlists */}
        {/* <Tabs defaultValue="library" className="w-full">
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
                  className={`relative flex items-center justify-between p-4 rounded-2xl border hover:shadow-md transition-all cursor-pointer ${
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
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm text-muted-foreground mr-1">
                      {formatTime(track.duration)}
                    </span>
                    <button
                      className="border rounded-2xl p-1 hover:bg-accent"
                      onClick={() => setOpenMenuTrackId((prev) => (prev === track.id ? null : track.id))}
                      aria-label="Track actions"
                      data-track-menu-btn
                      data-track-id={track.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuTrackId === track.id && (
                      <div
                        className="absolute right-3 top-12 z-20 w-56 rounded-2xl p-3 space-y-3 border border-white/10 bg-zinc-900/60 backdrop-blur-md shadow-2xl ring-1 ring-white/10"
                        data-track-menu
                        data-track-id={track.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {playlists.length > 0 ? (
                          <div>
                            <div className="text-xs text-zinc-300/80 px-2 pb-1">Add to playlist</div>
                            <Select onValueChange={(playlistId) => { addToPlaylist(playlistId, track.id); setOpenMenuTrackId(null) }}>
                              <SelectTrigger className="h-9 px-3 py-1.5 border border-white/10 rounded-2xl text-xs bg-transparent text-white hover:bg-white/5">
                                <SelectValue placeholder="Choose playlist" />
                              </SelectTrigger>
                              <SelectContent className="border border-white/10 rounded-2xl shadow-xl max-h-56 overflow-auto bg-zinc-900/80 backdrop-blur-md">
                                {playlists
                                  .filter((p) => !p.tracks.includes(track.id))
                                  .map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-300/80 px-2">No playlists yet</div>
                        )}
                        <div className="h-px bg-white/10 my-1" />
                        <button
                          className="w-full text-left border border-white/10 rounded-2xl px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                          onClick={() => deleteTrack(track.id)}
                        >
                          Delete track
                        </button>
                      </div>
                    )}
                  </div>
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
                      <button className="border rounded-2xl px-2 py-1 hover:bg-accent" onClick={() => playPlaylist(playlist)}>
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
        </Tabs> */}

<Tabs defaultValue="library" className="w-full">
  {/* Tabs header */}
  <TabsList className="grid w-full grid-cols-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-md overflow-hidden">
    <TabsTrigger
      value="library"
      className="py-4 text-white text-sm font-medium transition-all duration-200 hover:bg-zinc-800 data-[state=active]:bg-primary data-[state=active]:text-white"
    >
      Music Library
    </TabsTrigger>
    <TabsTrigger
      value="playlists"
      className="py-2 text-white text-sm font-medium transition-all duration-200 hover:bg-zinc-800 data-[state=active]:bg-primary data-[state=active]:text-white"
    >
      Playlists
    </TabsTrigger>
  </TabsList>

  {/* Music Library */}
  <TabsContent value="library" className="space-y-4 pt-4">
    <div className="space-y-2">
      {filteredTracks.map((track) => (
        <div
          key={track.id}
          onClick={() => playTrack(track)}
          className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
            currentTrack?.id === track.id
              ? "bg-primary/20 border-primary shadow-md"
              : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                playTrack(track)
              }}
              className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-700 hover:bg-zinc-700"
            >
              {currentTrack?.id === track.id && isPlaying ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
            </button>
            <div>
              <p className="font-medium text-white text-base">{track.title}</p>
              <p className="text-sm text-zinc-400">{track.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">
              {formatTime(track.duration)}
            </span>
            <button
              className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-700 hover:bg-zinc-700 group"
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuTrackId((prev) => (prev === track.id ? null : track.id))
              }}
              title="Add to playlist"
            >
              <svg className="h-4 w-4 text-white group-hover:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            {openMenuTrackId === track.id && (
              <div
                className="absolute right-3 top-12 z-20 w-64 rounded-xl p-4 space-y-3 border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl ring-1 ring-white/10"
                data-track-menu
                data-track-id={track.id}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-sm font-medium text-white mb-2">Add to playlist</div>
                {playlists.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {playlists
                      .filter((p) => !p.tracks.includes(track.id))
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            addToPlaylist(p.id, track.id)
                            setOpenMenuTrackId(null)
                          }}
                          className="w-full text-left p-2 rounded-lg bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-700/80 transition-all duration-200 text-white text-sm"
                        >
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-zinc-400">{p.tracks.length} tracks</div>
                        </button>
                      ))}
                    {playlists.filter((p) => !p.tracks.includes(track.id)).length === 0 && (
                      <div className="text-sm text-zinc-400 px-2 py-1">All playlists already contain this track</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400 px-2 py-1">No playlists yet</div>
                )}
                <div className="h-px bg-white/10 my-2" />
                <button
                  onClick={() => {
                    setShowCreatePlaylist(true)
                    setOpenMenuTrackId(null)
                  }}
                  className="w-full text-left p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all duration-200 text-emerald-300 text-sm font-medium"
                >
                  + Create new playlist
                </button>
              </div>
            )}
            <button
              className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-700 hover:bg-zinc-700 group"
              onClick={(e) => {
                e.stopPropagation()
                deleteTrack(track.id)
              }}
              title="Delete track"
            >
              <svg className="h-4 w-4 text-white group-hover:text-red-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {filteredTracks.length === 0 && (
        <div className="text-center py-10 text-zinc-500">
          {tracks.length === 0 ? "No music uploaded yet" : "No tracks match your search"}
        </div>
      )}
      

    </div>
  </TabsContent>

  {/* Playlists */}
  <TabsContent value="playlists" className="space-y-4 pt-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-white">Your Playlists</h3>
      <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
        <DialogTrigger asChild>
          <button className="px-3 py-2 rounded-xl bg-zinc-800 text-white border border-zinc-700 shadow hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all">
            Create Playlist
          </button>
        </DialogTrigger>
        <DialogContent className="rounded-xl shadow-xl border border-zinc-700 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="playlist-name" className="block text-sm mb-1">
                Playlist Name
              </label>
              <input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
                className="w-full p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="playlist-description" className="block text-sm mb-1">
                Description (optional)
              </label>
              <Textarea
                id="playlist-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={createPlaylist}
              className="w-full px-3 py-2 rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition-all"
            >
              Create Playlist
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <div className="grid gap-4">
      {playlists.map((playlist) => (
        <div
          key={playlist.id}
          className="border border-zinc-700 rounded-xl p-4 bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer shadow-md"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">{playlist.name}</h3>
              {playlist.description && (
                <p className="text-sm text-zinc-400 mt-1">{playlist.description}</p>
              )}
              <p className="text-sm text-zinc-400 mt-1">{playlist.tracks.length} tracks</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded-xl bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-700 hover:scale-105 active:scale-95 transition-all"
                onClick={() => setCurrentPlaylist(playlist)}
              >
                Play
              </button>
              <button
                className="px-3 py-1 rounded-xl border border-red-500 text-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all"
                onClick={() => deletePlaylist(playlist.id)}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-2 mt-3">
            {playlist.tracks.map((trackId) => {
              const track = tracks.find((t) => t.id === trackId)
              if (!track) return null
              return (
                <div
                  key={trackId}
                  className="flex items-center justify-between p-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-700 hover:bg-zinc-700"
                      onClick={() => playTrack(track)}
                    >
                      <Play className="h-4 w-4 text-white" />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-white">{track.title}</p>
                      <p className="text-xs text-zinc-400">{track.artist}</p>
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-700 hover:bg-zinc-700 group"
                    onClick={() => removeFromPlaylist(playlist.id, trackId)}
                    title="Remove from playlist"
                  >
                    <svg className="h-4 w-4 text-white group-hover:text-red-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
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


  )
}
