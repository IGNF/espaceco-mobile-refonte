import { useState } from 'react'

const STORAGE_KEY = 'welcome_seen'

export function useFirstRun() {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    return seen !== 'true'
  })

  const markAsSeen = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsFirstRun(false)
  }

  return {
    isFirstRun,
    markAsSeen,
  }
}
