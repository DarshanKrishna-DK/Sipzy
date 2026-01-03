import { Metadata } from 'next'
import { WatchPageClient } from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  
  return {
    title: `Watch & Trade | Sipzy`,
    description: `Trade creator tokens while watching content. Video ID: ${id}`,
    openGraph: {
      title: `Watch & Trade on Sipzy`,
      description: 'Join the creator economy. Buy tokens, support creators, earn rewards.',
      images: [`https://img.youtube.com/vi/${id}/maxresdefault.jpg`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Watch & Trade on Sipzy`,
      description: 'Join the creator economy. Buy tokens, support creators, earn rewards.',
      images: [`https://img.youtube.com/vi/${id}/maxresdefault.jpg`],
    },
  }
}

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params
  
  return <WatchPageClient videoId={id} />
}

