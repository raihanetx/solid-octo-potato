'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'

const SettingsView: React.FC = () => {
  const { settings, setSettings, showToastMsg, refetchSettings } = useAdmin()
  
  const [universalDelivery, setUniversalDelivery] = useState(false)
  const [universalDeliveryCharge, setUniversalDeliveryCharge] = useState(60)
  const [offerTitle, setOfferTitle] = useState('')
  const [offerSlogan, setOfferSlogan] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [heroImages, setHeroImages] = useState<string[]>([])
  
  const syncedRef = useRef(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!syncedRef.current) {
      setUniversalDelivery(settings.universalDelivery ?? false)
      setUniversalDeliveryCharge(settings.universalDeliveryCharge ?? 60)
      setOfferTitle(settings.offerTitle ?? 'Offers')
      setOfferSlogan(settings.offerSlogan ?? 'Exclusive deals just for you')
      
      // Parse hero images from JSON string or use directly if array
      if (settings.heroImages) {
        try {
          const parsed = typeof settings.heroImages === 'string' 
            ? JSON.parse(settings.heroImages) 
            : settings.heroImages
          setHeroImages(Array.isArray(parsed) ? parsed : [])
        } catch {
          setHeroImages([])
        }
      }
      syncedRef.current = true
    }
  }, [settings])

  const uploadImage = async (file: File, type: string): Promise<string | null> => {
    setUploading(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        return result.url
      } else {
        showToastMsg(result.error || 'Upload failed')
        return null
      }
    } catch (error) {
      console.error('Upload error:', error)
      showToastMsg('Failed to upload image')
      return null
    } finally {
      setUploading(null)
    }
  }

  // Helper function to save a single field immediately
  const saveField = async (field: string, value: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          [field]: value,
          heroImages: JSON.stringify(heroImages),
        }),
      })
      const result = await response.json()
      if (result.success) {
        await refetchSettings()
        return true
      }
      return false
    } catch (error) {
      console.error('Error saving:', error)
      return false
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const url = await uploadImage(file, 'logo')
    if (url) {
      const newSettings = { ...settings, logoUrl: url }
      setSettings(newSettings)
      // Auto-save immediately
      const saved = await saveField('logoUrl', url)
      showToastMsg(saved ? 'Logo saved!' : 'Failed to save logo')
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const url = await uploadImage(file, 'favicon')
    if (url) {
      const newSettings = { ...settings, faviconUrl: url }
      setSettings(newSettings)
      // Auto-save immediately
      const saved = await saveField('faviconUrl', url)
      showToastMsg(saved ? 'Favicon saved!' : 'Failed to save favicon')
    }
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploading('hero')
    const newUrls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const url = await uploadImage(files[i], `hero-${i}`)
      if (url) newUrls.push(url)
    }
    
    if (newUrls.length > 0) {
      const updated = [...heroImages, ...newUrls]
      setHeroImages(updated)
      // Auto-save hero images
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...settings,
            heroImages: JSON.stringify(updated),
          }),
        })
        await refetchSettings()
        showToastMsg(`${newUrls.length} hero image(s) saved!`)
      } catch {
        showToastMsg('Failed to save hero images')
      }
    }
    setUploading(null)
  }

  const removeHeroImage = async (index: number) => {
    const updated = heroImages.filter((_, i) => i !== index)
    setHeroImages(updated)
    // Auto-save after removal
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          heroImages: JSON.stringify(updated),
        }),
      })
      await refetchSettings()
      showToastMsg('Image removed')
    } catch {
      showToastMsg('Failed to remove image')
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteName: settings.websiteName,
          slogan: settings.slogan,
          logoUrl: settings.logoUrl,
          faviconUrl: settings.faviconUrl,
          heroImages: JSON.stringify(heroImages),
          insideDhakaDelivery: settings.insideDhakaDelivery,
          outsideDhakaDelivery: settings.outsideDhakaDelivery,
          freeDeliveryMin: settings.freeDeliveryMin,
          universalDelivery: universalDelivery,
          universalDeliveryCharge: universalDeliveryCharge,
          whatsappNumber: settings.whatsappNumber,
          phoneNumber: settings.phoneNumber,
          facebookUrl: settings.facebookUrl,
          messengerUsername: settings.messengerUsername,
          offerTitle: offerTitle,
          offerSlogan: offerSlogan,
          aboutUs: settings.aboutUs,
          termsConditions: settings.termsConditions,
          refundPolicy: settings.refundPolicy,
          privacyPolicy: settings.privacyPolicy,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await refetchSettings()
        showToastMsg('Settings saved! Refreshing...')
        // Auto refresh after 2 seconds to apply changes everywhere
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        showToastMsg('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showToastMsg('Error saving settings')
    }
  }

  return (
    <div className="p-4 md:p-8" style={{fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#0f172a', margin: '0', minHeight: 'calc(100vh - 80px)'}}>
      <div style={{padding: '2rem', maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem'}}>
          {/* Left Column */}
          <div>
            {/* Branding Card */}
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
              <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <i className="ri-medal-line"></i> Store Branding
              </h3>
              
              {/* Website Name */}
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Website Name</label>
                <input type="text" placeholder="EcoMart" value={settings.websiteName || ''}
                  onChange={(e) => setSettings({...settings, websiteName: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              
              {/* Slogan */}
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Slogan</label>
                <input type="text" placeholder="Freshness at your door" value={settings.slogan || ''}
                  onChange={(e) => setSettings({...settings, slogan: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              
              {/* Logo Upload */}
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Logo</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" style={{width: '60px', height: '60px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px'}} />
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{display: 'none'}} />
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploading === 'logo'}
                    style={{padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'}}>
                    {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </div>
              </div>
              
              {/* Favicon Upload */}
              <div style={{marginBottom: '0'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Favicon</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  {settings.faviconUrl && (
                    <img src={settings.faviconUrl} alt="Favicon" style={{width: '32px', height: '32px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px'}} />
                  )}
                  <input ref={faviconInputRef} type="file" accept="image/*,.ico" onChange={handleFaviconUpload} style={{display: 'none'}} />
                  <button onClick={() => faviconInputRef.current?.click()} disabled={uploading === 'favicon'}
                    style={{padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'}}>
                    {uploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Images Card */}
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
              <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <i className="ri-image-line"></i> Hero Section Images
              </h3>
              
              <input ref={heroInputRef} type="file" accept="image/*" multiple onChange={handleHeroUpload} style={{display: 'none'}} />
              
              {/* Hero Images Grid */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px'}}>
                {heroImages.map((url, index) => (
                  <div key={index} style={{position: 'relative'}}>
                    <img src={url} alt={`Hero ${index + 1}`} style={{width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px'}} />
                    <button onClick={() => removeHeroImage(index)}
                      style={{position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <i className="ri-close-line" style={{fontSize: '14px'}}></i>
                    </button>
                  </div>
                ))}
              </div>
              
              <button onClick={() => heroInputRef.current?.click()} disabled={uploading === 'hero'}
                style={{width: '100%', padding: '10px', background: '#ffffff', border: '2px dashed #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem'}}>
                {uploading === 'hero' ? 'Uploading...' : '+ Add Hero Images'}
              </button>
            </div>

            {/* Delivery Card */}
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
              <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <i className="ri-truck-line"></i> Delivery Settings
              </h3>
              
              {/* Universal Delivery Toggle */}
              <div style={{background: '#ffffff', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0'}}>
                <div>
                  <span style={{fontSize: '0.85rem', fontWeight: 500, color: '#0f172a'}}>Universal Delivery</span>
                  <p style={{fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0'}}>Same charge for all locations</p>
                </div>
                <div onClick={() => setUniversalDelivery(!universalDelivery)}
                  style={{width: '44px', height: '24px', borderRadius: '12px', background: universalDelivery ? '#16a34a' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s'}}>
                  <div style={{width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: universalDelivery ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}}></div>
                </div>
              </div>
              
              {universalDelivery ? (
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Delivery Charge (TK) - All Locations</label>
                  <input type="number" value={universalDeliveryCharge} onChange={(e) => setUniversalDeliveryCharge(parseInt(e.target.value) || 0)}
                    style={{width: '100%', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
                </div>
              ) : (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                  <div>
                    <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Inside Dhaka (TK)</label>
                    <input type="number" value={settings.insideDhakaDelivery || 60} onChange={(e) => setSettings({...settings, insideDhakaDelivery: parseInt(e.target.value) || 0})}
                      style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
                  </div>
                  <div>
                    <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Outside Dhaka (TK)</label>
                    <input type="number" value={settings.outsideDhakaDelivery || 120} onChange={(e) => setSettings({...settings, outsideDhakaDelivery: parseInt(e.target.value) || 0})}
                      style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
                  </div>
                </div>
              )}
              
              <div style={{marginBottom: '0'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Free Delivery Minimum (TK)</label>
                <input type="number" value={settings.freeDeliveryMin || 500} onChange={(e) => setSettings({...settings, freeDeliveryMin: parseInt(e.target.value) || 0})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
            </div>

            {/* Social Links */}
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
              <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <i className="ri-links-line"></i> Social & Contact
              </h3>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>WhatsApp Number</label>
                <input type="text" placeholder="+8801xxxxxxxxx" value={settings.whatsappNumber || ''} onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Phone Number</label>
                <input type="text" placeholder="+8801xxxxxxxxx" value={settings.phoneNumber || ''} onChange={(e) => setSettings({...settings, phoneNumber: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Facebook Page URL</label>
                <input type="text" placeholder="https://facebook.com/yourpage" value={settings.facebookUrl || ''} onChange={(e) => setSettings({...settings, facebookUrl: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              <div style={{marginBottom: '0'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Messenger Username</label>
                <input type="text" placeholder="groceryhub.bd" value={settings.messengerUsername || ''} onChange={(e) => setSettings({...settings, messengerUsername: e.target.value})}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
            </div>

            {/* Offer Section Settings */}
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
              <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <i className="ri-gift-2-line"></i> Offer Section
              </h3>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Offer Title</label>
                <input type="text" placeholder="Offers" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
              <div style={{marginBottom: '0'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500}}>Offer Slogan</label>
                <input type="text" placeholder="Exclusive deals just for you" value={offerSlogan} onChange={(e) => setOfferSlogan(e.target.value)}
                  style={{width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#0f172a', fontSize: '0.9rem', outline: 'none'}} />
              </div>
            </div>
          </div>

          {/* Right Column: Save Button */}
          <div>
            {/* Save Button */}
            <button onClick={handleSaveSettings}
              style={{background: '#16a34a', color: '#ffffff', fontWeight: 700, padding: '0.8rem 2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'transform 0.2s, opacity 0.2s', border: 'none', width: '100%', fontSize: '0.95rem'}}>
              <i className="ri-save-line"></i> Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsView
