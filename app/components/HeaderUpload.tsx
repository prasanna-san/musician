"use client"

import { useRef } from "react"

interface HeaderUploadProps {
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export default function HeaderUpload({ onFilesSelected }: HeaderUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-primary">Aashi Music</h1>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={onFilesSelected}
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
  )
}


