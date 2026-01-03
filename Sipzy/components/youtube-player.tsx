'use client'

import { FC } from 'react'

interface YouTubePlayerProps {
  videoId: string
}

export const YouTubePlayer: FC<YouTubePlayerProps> = ({ videoId }) => {
  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
        title="YouTube Video Player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Gradient overlay for aesthetic */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent" />
    </div>
  )
}

