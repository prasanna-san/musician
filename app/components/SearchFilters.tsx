"use client"

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select"

interface SearchFiltersProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  genreFilter: string
  setGenreFilter: (value: string) => void
  genres: string[]
}

export default function SearchFilters({ searchQuery, setSearchQuery, genreFilter, setGenreFilter, genres }: SearchFiltersProps) {
  return (
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
  )
}


