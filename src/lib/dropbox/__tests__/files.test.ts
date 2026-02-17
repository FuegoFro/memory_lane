import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the client module
const mockFilesListFolder = vi.fn()
const mockFilesGetTemporaryLink = vi.fn()
const mockFilesUpload = vi.fn()
const mockFilesDeleteV2 = vi.fn()

const mockDropboxClient = {
  filesListFolder: mockFilesListFolder,
  filesGetTemporaryLink: mockFilesGetTemporaryLink,
  filesUpload: mockFilesUpload,
  filesDeleteV2: mockFilesDeleteV2,
}

vi.mock('../client', () => ({
  getDropboxClient: vi.fn(() => Promise.resolve(mockDropboxClient)),
  getDropboxFolder: vi.fn(() => ''),
}))

describe('Dropbox file operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('listMediaFiles', () => {
    it('should return an array of media files from the Dropbox folder', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            {
              '.tag': 'file',
              name: 'vacation.jpg',
              path_display: '/vacation.jpg',
              path_lower: '/vacation.jpg',
            },
            {
              '.tag': 'file',
              name: 'birthday.png',
              path_display: '/birthday.png',
              path_lower: '/birthday.png',
            },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(2)
      expect(files[0]).toEqual({
        path: '/vacation.jpg',
        name: 'vacation.jpg',
        isVideo: false,
        hasNarration: false,
      })
    })

    it('should filter out non-media files', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            {
              '.tag': 'file',
              name: 'photo.jpg',
              path_display: '/photo.jpg',
              path_lower: '/photo.jpg',
            },
            {
              '.tag': 'file',
              name: 'document.pdf',
              path_display: '/document.pdf',
              path_lower: '/document.pdf',
            },
            {
              '.tag': 'file',
              name: 'readme.txt',
              path_display: '/readme.txt',
              path_lower: '/readme.txt',
            },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('photo.jpg')
    })

    it('should recognize all image extensions (.jpg, .jpeg, .png, .gif, .webp)', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            { '.tag': 'file', name: 'a.jpg', path_display: '/a.jpg', path_lower: '/a.jpg' },
            { '.tag': 'file', name: 'b.jpeg', path_display: '/b.jpeg', path_lower: '/b.jpeg' },
            { '.tag': 'file', name: 'c.png', path_display: '/c.png', path_lower: '/c.png' },
            { '.tag': 'file', name: 'd.gif', path_display: '/d.gif', path_lower: '/d.gif' },
            { '.tag': 'file', name: 'e.webp', path_display: '/e.webp', path_lower: '/e.webp' },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(5)
      files.forEach((file) => {
        expect(file.isVideo).toBe(false)
      })
    })

    it('should recognize all video extensions (.mp4, .mov, .webm, .avi)', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            { '.tag': 'file', name: 'a.mp4', path_display: '/a.mp4', path_lower: '/a.mp4' },
            { '.tag': 'file', name: 'b.mov', path_display: '/b.mov', path_lower: '/b.mov' },
            { '.tag': 'file', name: 'c.webm', path_display: '/c.webm', path_lower: '/c.webm' },
            { '.tag': 'file', name: 'd.avi', path_display: '/d.avi', path_lower: '/d.avi' },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(4)
      files.forEach((file) => {
        expect(file.isVideo).toBe(true)
      })
    })

    it('should handle case-insensitive file extensions', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            { '.tag': 'file', name: 'PHOTO.JPG', path_display: '/PHOTO.JPG', path_lower: '/photo.jpg' },
            { '.tag': 'file', name: 'video.MP4', path_display: '/video.MP4', path_lower: '/video.mp4' },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(2)
      expect(files[0].isVideo).toBe(false)
      expect(files[1].isVideo).toBe(true)
    })

    it('should correctly detect hasNarration when narration file exists', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            {
              '.tag': 'file',
              name: 'vacation.jpg',
              path_display: '/vacation.jpg',
              path_lower: '/vacation.jpg',
            },
            {
              '.tag': 'file',
              name: 'vacation.jpg.narration.webm',
              path_display: '/vacation.jpg.narration.webm',
              path_lower: '/vacation.jpg.narration.webm',
            },
            {
              '.tag': 'file',
              name: 'birthday.png',
              path_display: '/birthday.png',
              path_lower: '/birthday.png',
            },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(2)
      const vacationFile = files.find((f) => f.name === 'vacation.jpg')
      const birthdayFile = files.find((f) => f.name === 'birthday.png')
      expect(vacationFile?.hasNarration).toBe(true)
      expect(birthdayFile?.hasNarration).toBe(false)
    })

    it('should exclude folder entries', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: {
          entries: [
            {
              '.tag': 'folder',
              name: 'subfolder',
              path_display: '/subfolder',
              path_lower: '/subfolder',
            },
            {
              '.tag': 'file',
              name: 'photo.jpg',
              path_display: '/photo.jpg',
              path_lower: '/photo.jpg',
            },
          ],
        },
      })

      const { listMediaFiles } = await import('../files')
      const files = await listMediaFiles()

      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('photo.jpg')
    })

    it('should call filesListFolder with the correct folder path', async () => {
      mockFilesListFolder.mockResolvedValue({
        result: { entries: [] },
      })

      const { listMediaFiles } = await import('../files')
      await listMediaFiles()

      expect(mockFilesListFolder).toHaveBeenCalledWith({ path: '' })
    })
  })

  describe('getTemporaryLink', () => {
    it('should return a temporary link from the Dropbox API', async () => {
      mockFilesGetTemporaryLink.mockResolvedValue({
        result: { link: 'https://dl.dropbox.com/temp-link-123' },
      })

      const { getTemporaryLink } = await import('../files')
      const link = await getTemporaryLink('/photo.jpg')

      expect(link).toBe('https://dl.dropbox.com/temp-link-123')
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledWith({ path: '/photo.jpg' })
    })

    it('should return cached link on second call within cache period', async () => {
      mockFilesGetTemporaryLink.mockResolvedValue({
        result: { link: 'https://dl.dropbox.com/cached-link' },
      })

      const { getTemporaryLink } = await import('../files')

      const link1 = await getTemporaryLink('/photo.jpg')
      const link2 = await getTemporaryLink('/photo.jpg')

      expect(link1).toBe('https://dl.dropbox.com/cached-link')
      expect(link2).toBe('https://dl.dropbox.com/cached-link')
      // Should only call API once due to caching
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(1)
    })

    it('should fetch new link when cache expires', async () => {
      const originalDateNow = Date.now
      let currentTime = originalDateNow()
      Date.now = vi.fn(() => currentTime)

      mockFilesGetTemporaryLink
        .mockResolvedValueOnce({ result: { link: 'https://dl.dropbox.com/link-1' } })
        .mockResolvedValueOnce({ result: { link: 'https://dl.dropbox.com/link-2' } })

      const { getTemporaryLink } = await import('../files')

      const link1 = await getTemporaryLink('/photo.jpg')
      expect(link1).toBe('https://dl.dropbox.com/link-1')

      // Advance time by 4 hours (cache expires after 3 hours)
      currentTime += 4 * 60 * 60 * 1000

      const link2 = await getTemporaryLink('/photo.jpg')
      expect(link2).toBe('https://dl.dropbox.com/link-2')
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(2)

      Date.now = originalDateNow
    })
  })

  describe('uploadNarration', () => {
    it('should call filesUpload with the correct narration path and data', async () => {
      mockFilesUpload.mockResolvedValue({ result: {} })

      const { uploadNarration } = await import('../files')
      const audioData = Buffer.from('fake audio data')

      await uploadNarration('/photo.jpg', audioData)

      expect(mockFilesUpload).toHaveBeenCalledWith({
        path: '/photo.jpg.narration.webm',
        contents: audioData,
        mode: { '.tag': 'overwrite' },
      })
    })

    it('should invalidate the link cache for the narration file', async () => {
      mockFilesUpload.mockResolvedValue({ result: {} })
      mockFilesGetTemporaryLink.mockResolvedValue({
        result: { link: 'https://dl.dropbox.com/narration-link' },
      })

      const { uploadNarration, getTemporaryLink } = await import('../files')

      // First, get a link to populate the cache
      const narrationPath = '/photo.jpg.narration.webm'
      await getTemporaryLink(narrationPath)
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(1)

      // Upload a new narration
      await uploadNarration('/photo.jpg', Buffer.from('new audio'))

      // Getting the link again should fetch from API (cache invalidated)
      await getTemporaryLink(narrationPath)
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteNarration', () => {
    it('should call filesDeleteV2 with the correct narration path', async () => {
      mockFilesDeleteV2.mockResolvedValue({ result: {} })

      const { deleteNarration } = await import('../files')
      await deleteNarration('/photo.jpg')

      expect(mockFilesDeleteV2).toHaveBeenCalledWith({
        path: '/photo.jpg.narration.webm',
      })
    })

    it('should not throw if the narration file does not exist (409 path_not_found)', async () => {
      const notFoundError = {
        status: 409,
        error: { error_summary: 'path_lookup/not_found/' },
      }
      mockFilesDeleteV2.mockRejectedValue(notFoundError)

      const { deleteNarration } = await import('../files')

      // Should not throw
      await expect(deleteNarration('/photo.jpg')).resolves.toBeUndefined()
    })

    it('should throw for other HTTP errors', async () => {
      const otherError = { status: 500, message: 'Server error' }
      mockFilesDeleteV2.mockRejectedValue(otherError)

      const { deleteNarration } = await import('../files')

      await expect(deleteNarration('/photo.jpg')).rejects.toEqual(otherError)
    })

    it('should throw for errors without a status property', async () => {
      const networkError = new Error('Network failure')
      mockFilesDeleteV2.mockRejectedValue(networkError)

      const { deleteNarration } = await import('../files')

      await expect(deleteNarration('/photo.jpg')).rejects.toThrow('Network failure')
    })

    it('should only swallow path_not_found 409 errors, not other 409 errors', async () => {
      const conflictError = {
        status: 409,
        error: { error_summary: 'too_many_write_operations/...' },
      }
      mockFilesDeleteV2.mockRejectedValue(conflictError)

      const { deleteNarration } = await import('../files')

      await expect(deleteNarration('/photo.jpg')).rejects.toEqual(conflictError)
    })

    it('should invalidate the link cache for the narration file', async () => {
      mockFilesDeleteV2.mockResolvedValue({ result: {} })
      mockFilesGetTemporaryLink.mockResolvedValue({
        result: { link: 'https://dl.dropbox.com/narration-link' },
      })

      const { deleteNarration, getTemporaryLink } = await import('../files')

      // First, get a link to populate the cache
      const narrationPath = '/photo.jpg.narration.webm'
      await getTemporaryLink(narrationPath)
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(1)

      // Delete the narration
      await deleteNarration('/photo.jpg')

      // Getting the link again should fetch from API (cache invalidated)
      await getTemporaryLink(narrationPath)
      expect(mockFilesGetTemporaryLink).toHaveBeenCalledTimes(2)
    })
  })

  describe('getNarrationPath', () => {
    it('should append .narration.webm suffix to the media path', async () => {
      const { getNarrationPath } = await import('../files')

      expect(getNarrationPath('/photo.jpg')).toBe('/photo.jpg.narration.webm')
      expect(getNarrationPath('/video.mp4')).toBe('/video.mp4.narration.webm')
      expect(getNarrationPath('/path/with spaces/file.png')).toBe('/path/with spaces/file.png.narration.webm')
    })
  })
})
