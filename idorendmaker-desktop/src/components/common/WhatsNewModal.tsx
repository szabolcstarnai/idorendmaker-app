/**
 * What's New Modal Component
 * Shows version update notifications with markdown support
 */

import React, { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

interface WhatsNewContent {
  title: string
  content: string
}

interface WhatsNewModalProps {
  version?: string
  content?: WhatsNewContent
  isOpen: boolean
  onClose: () => void
}

interface WhatsNewEvent {
  detail: {
    version: string
    content: WhatsNewContent
    onClose: () => void
  }
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  version,
  content,
  isOpen,
  onClose,
}) => {
  const [currentVersion, setCurrentVersion] = useState(version)
  const [currentContent, setCurrentContent] = useState(content)
  const [isModalOpen, setIsModalOpen] = useState(isOpen)

  const handleClose = () => {
    setIsModalOpen(false)
    onClose()
  }

  const formatMarkdownContent = (markdownText: string): React.ReactNode => {
    // Simple markdown parser for basic formatting
    return markdownText
      .split('\n')
      .map((line, index) => {
        // Handle headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-xl font-bold mb-2">{line.slice(2)}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-lg font-semibold mb-2">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-md font-medium mb-1">{line.slice(4)}</h3>
        }

        // Handle bullet points
        if (line.startsWith('- ')) {
          const content = line.slice(2)
          // Handle checkmarks and emojis
          const formattedContent = content
            .replace(/✅/g, '✅')
            .replace(/🎉/g, '🎉')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text

          return (
            <li
              key={index}
              className="ml-4 mb-1 list-disc"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          )
        }

        // Handle bold text in regular lines
        if (line.includes('**')) {
          const formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/🎉/g, '🎉')

          return (
            <p
              key={index}
              className="mb-2"
              dangerouslySetInnerHTML={{ __html: formattedLine }}
            />
          )
        }

        // Handle empty lines
        if (line.trim() === '') {
          return <div key={index} className="mb-2"></div>
        }

        // Regular lines
        return <p key={index} className="mb-2">{line}</p>
      })
  }

  if (!currentContent || !currentVersion) {
    return null
  }

  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <AlertDialogContent className="max-w-md md:max-w-lg max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            {currentContent.title}
            <span className="text-sm font-normal text-muted-foreground">
              v{currentVersion}
            </span>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="text-left space-y-2">
            {formatMarkdownContent(currentContent.content)}
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose} className="w-full">
            Got it!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Global What's New Modal Manager
 * Listens for custom events to show what's new modals
 */
export const WhatsNewModalManager: React.FC = () => {
  const [currentModal, setCurrentModal] = useState<{
    version: string
    content: WhatsNewContent
    onClose: () => void
  } | null>(null)

  useEffect(() => {
    const handleShowWhatsNew = (event: WhatsNewEvent) => {
      setCurrentModal({
        version: event.detail.version,
        content: event.detail.content,
        onClose: event.detail.onClose,
      })
    }

    // Listen for custom show-whats-new events
    window.addEventListener('show-whats-new', handleShowWhatsNew as EventListener)

    return () => {
      window.removeEventListener('show-whats-new', handleShowWhatsNew as EventListener)
    }
  }, [])

  const handleClose = () => {
    if (currentModal) {
      currentModal.onClose()
      setCurrentModal(null)
    }
  }

  if (!currentModal) {
    return null
  }

  return (
    <WhatsNewModal
      version={currentModal.version}
      content={currentModal.content}
      isOpen={!!currentModal}
      onClose={handleClose}
    />
  )
}