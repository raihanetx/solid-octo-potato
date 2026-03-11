'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'

type TabType = 'general' | 'delivery' | 'social' | 'offers'

const SettingsView: React.FC = () => {
  const { settings, setSettings, showToastMsg, refetchSettings } = useAdmin()
  
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [universalDelivery, setUniversalDelivery] = useState(false)
  const [universalDeliveryCharge, setUniversalDeliveryCharge] = useState(60)
  const [offerTitle, setOfferTitle] = useState('')
  const [offerSlogan, setOfferSlogan] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const url = await uploadImage(file, 'logo')
    if (url) {
      setSettings({ ...settings, logoUrl: url })
      await saveSettings({ logoUrl: url })
      showToastMsg('Logo saved!')
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const url = await uploadImage(file, 'favicon')
    if (url) {
      setSettings({ ...settings, faviconUrl: url })
      await saveSettings({ faviconUrl: url })
      showToastMsg('Favicon saved!')
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
      await saveSettings({ heroImages: JSON.stringify(updated) })
      showToastMsg(`${newUrls.length} hero image(s) saved!`)
    }
    setUploading(null)
  }

  const removeHeroImage = async (index: number) => {
    const updated = heroImages.filter((_, i) => i !== index)
    setHeroImages(updated)
    await saveSettings({ heroImages: JSON.stringify(updated) })
    showToastMsg('Image removed')
  }

  const saveSettings = async (overrides: Partial<typeof settings> = {}) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          heroImages: JSON.stringify(heroImages),
          universalDelivery,
          universalDeliveryCharge,
          offerTitle,
          offerSlogan,
          ...overrides,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await refetchSettings()
        return true
      }
      return false
    } catch (error) {
      console.error('Error saving settings:', error)
      return false
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const success = await saveSettings()
    if (success) {
      showToastMsg('Settings saved successfully!')
    } else {
      showToastMsg('Failed to save settings')
    }
    setSaving(false)
  }

  const tabs: { id: TabType; label: string; icon: string; description: string }[] = [
    { id: 'general', label: 'General', icon: 'ri-settings-3-line', description: 'Store identity & branding' },
    { id: 'delivery', label: 'Delivery', icon: 'ri-truck-line', description: 'Shipping & charges' },
    { id: 'social', label: 'Contact', icon: 'ri-customer-service-2-line', description: 'Phone & social links' },
    { id: 'offers', label: 'Offers', icon: 'ri-gift-2-line', description: 'Promotional settings' },
  ]

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f8fafc]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Settings</h1>
          <p className="text-[#64748b] text-sm mt-1">Manage your store configuration and preferences</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 shrink-0">
            <nav className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-[#f1f5f9] last:border-b-0 ${
                    activeTab === tab.id
                      ? 'bg-[#f0fdf4] border-l-2 border-l-[#16a34a]'
                      : 'hover:bg-[#f8fafc] border-l-2 border-l-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    activeTab === tab.id ? 'bg-[#16a34a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}>
                    <i className={`${tab.icon} text-lg`}></i>
                  </div>
                  <div>
                    <span className={`block text-sm font-medium ${activeTab === tab.id ? 'text-[#16a34a]' : 'text-[#0f172a]'}`}>
                      {tab.label}
                    </span>
                    <span className="text-xs text-[#94a3b8]">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Store Identity */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Store Identity</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Basic information about your store</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-2">Website Name</label>
                        <input
                          type="text"
                          placeholder="Your store name"
                          value={settings.websiteName || ''}
                          onChange={(e) => setSettings({ ...settings, websiteName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-2">Slogan</label>
                        <input
                          type="text"
                          placeholder="Your store tagline"
                          value={settings.slogan || ''}
                          onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branding Assets */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Branding Assets</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Logo and favicon for your store</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Logo */}
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-3">Logo</label>
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center justify-center overflow-hidden">
                            {settings.logoUrl ? (
                              <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                              <i className="ri-image-line text-[#cbd5e1] text-2xl"></i>
                            )}
                          </div>
                          <div className="flex-1">
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            <button
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploading === 'logo'}
                              className="px-4 py-2 bg-[#0f172a] text-white text-xs font-medium rounded-lg hover:bg-[#1e293b] transition-colors disabled:bg-[#cbd5e1]"
                            >
                              {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                            </button>
                            <p className="text-xs text-[#94a3b8] mt-2">PNG, JPG up to 2MB</p>
                          </div>
                        </div>
                      </div>

                      {/* Favicon */}
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-3">Favicon</label>
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center justify-center overflow-hidden">
                            {settings.faviconUrl ? (
                              <img src={settings.faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                              <i className="ri-global-line text-[#cbd5e1] text-2xl"></i>
                            )}
                          </div>
                          <div className="flex-1">
                            <input ref={faviconInputRef} type="file" accept="image/*,.ico" onChange={handleFaviconUpload} className="hidden" />
                            <button
                              onClick={() => faviconInputRef.current?.click()}
                              disabled={uploading === 'favicon'}
                              className="px-4 py-2 bg-[#0f172a] text-white text-xs font-medium rounded-lg hover:bg-[#1e293b] transition-colors disabled:bg-[#cbd5e1]"
                            >
                              {uploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}
                            </button>
                            <p className="text-xs text-[#94a3b8] mt-2">ICO, PNG 32x32px</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Images */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Hero Banners</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Slideshow images for homepage</p>
                  </div>
                  <div className="p-6">
                    {heroImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {heroImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Hero ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-[#e2e8f0]"
                            />
                            <button
                              onClick={() => removeHeroImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-[#ef4444] text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input ref={heroInputRef} type="file" accept="image/*" multiple onChange={handleHeroUpload} className="hidden" />
                    <button
                      onClick={() => heroInputRef.current?.click()}
                      disabled={uploading === 'hero'}
                      className="w-full py-4 border-2 border-dashed border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-all flex items-center justify-center gap-2"
                    >
                      <i className="ri-add-line text-lg"></i>
                      {uploading === 'hero' ? 'Uploading...' : 'Add Hero Images'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Tab */}
            {activeTab === 'delivery' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Delivery Charges</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Configure shipping rates for different zones</p>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Universal Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                          <i className="ri-equal-line text-[#16a34a] text-lg"></i>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-[#0f172a]">Universal Delivery Charge</span>
                          <p className="text-xs text-[#64748b]">Apply same rate for all locations</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUniversalDelivery(!universalDelivery)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${universalDelivery ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${universalDelivery ? 'translate-x-6' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>

                    {universalDelivery ? (
                      <div className="max-w-xs">
                        <label className="block text-xs font-medium text-[#475569] mb-2">Charge Amount (৳)</label>
                        <input
                          type="number"
                          value={universalDeliveryCharge}
                          onChange={(e) => setUniversalDeliveryCharge(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 bg-[#f0fdf4] border-2 border-[#16a34a] rounded-lg text-sm outline-none"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#475569] mb-2">Inside Dhaka (৳)</label>
                          <input
                            type="number"
                            value={settings.insideDhakaDelivery || 60}
                            onChange={(e) => setSettings({ ...settings, insideDhakaDelivery: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#475569] mb-2">Outside Dhaka (৳)</label>
                          <input
                            type="number"
                            value={settings.outsideDhakaDelivery || 120}
                            onChange={(e) => setSettings({ ...settings, outsideDhakaDelivery: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-[#475569] mb-2">Free Delivery Threshold (৳)</label>
                      <input
                        type="number"
                        value={settings.freeDeliveryMin || 500}
                        onChange={(e) => setSettings({ ...settings, freeDeliveryMin: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                      />
                      <p className="text-xs text-[#94a3b8] mt-2">Orders above this amount qualify for free delivery</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social Tab */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Contact Numbers</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Phone numbers for customer support</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-2 flex items-center gap-2">
                          <i className="ri-whatsapp-line text-[#25D366]"></i> WhatsApp Number
                        </label>
                        <input
                          type="text"
                          placeholder="+8801xxxxxxxxx"
                          value={settings.whatsappNumber || ''}
                          onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#475569] mb-2 flex items-center gap-2">
                          <i className="ri-phone-line text-[#16a34a]"></i> Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="+8801xxxxxxxxx"
                          value={settings.phoneNumber || ''}
                          onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Social Media</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Link your social profiles</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-2 flex items-center gap-2">
                        <i className="ri-facebook-fill text-[#1877F2]"></i> Facebook Page URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://facebook.com/yourpage"
                        value={settings.facebookUrl || ''}
                        onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#475569] mb-2 flex items-center gap-2">
                        <i className="ri-messenger-line text-[#0099FF]"></i> Messenger Username
                      </label>
                      <input
                        type="text"
                        placeholder="yourpage"
                        value={settings.messengerUsername || ''}
                        onChange={(e) => setSettings({ ...settings, messengerUsername: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#f1f5f9]">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Offer Section</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">Customize promotional section display</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="max-w-md">
                      <label className="block text-xs font-medium text-[#475569] mb-2">Section Title</label>
                      <input
                        type="text"
                        placeholder="Offers"
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                      />
                    </div>
                    <div className="max-w-md">
                      <label className="block text-xs font-medium text-[#475569] mb-2">Section Slogan</label>
                      <input
                        type="text"
                        placeholder="Exclusive deals just for you"
                        value={offerSlogan}
                        onChange={(e) => setOfferSlogan(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 transition-all"
                      />
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                      <i className="ri-information-line text-[#64748b] text-lg mt-0.5"></i>
                      <p className="text-xs text-[#64748b]">
                        The offer section displays products marked with special discounts on your storefront. 
                        Manage featured products from the Products section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-3 bg-[#16a34a] text-white text-sm font-semibold rounded-lg hover:bg-[#15803d] transition-colors flex items-center gap-2 disabled:bg-[#cbd5e1]"
              >
                <i className="ri-save-line"></i>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsView
