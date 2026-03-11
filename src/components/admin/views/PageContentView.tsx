'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAdmin } from '@/components/admin/context/AdminContext'

const PageContentView: React.FC = () => {
  const { settings, setSettings, showToastMsg, refetchSettings } = useAdmin()
  
  const [aboutUs, setAboutUs] = useState('')
  const [termsConditions, setTermsConditions] = useState('')
  const [refundPolicy, setRefundPolicy] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [saving, setSaving] = useState(false)
  
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!syncedRef.current) {
      setAboutUs(settings.aboutUs ?? '')
      setTermsConditions(settings.termsConditions ?? '')
      setRefundPolicy(settings.refundPolicy ?? '')
      setPrivacyPolicy(settings.privacyPolicy ?? '')
      syncedRef.current = true
    }
  }, [settings])

  const handleSaveContent = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          aboutUs,
          termsConditions,
          refundPolicy,
          privacyPolicy,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await refetchSettings()
        showToastMsg('Page content saved successfully!')
      } else {
        showToastMsg('Failed to save content')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      showToastMsg('Error saving content')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8" style={{fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#0f172a', minHeight: 'calc(100vh - 80px)'}}>
      <div style={{maxWidth: '900px', margin: '0 auto'}}>
        {/* Header */}
        <div style={{marginBottom: '24px'}}>
          <h1 style={{fontSize: '24px', fontWeight: 700, color: '#1c2333'}}>Page Content</h1>
          <p style={{fontSize: '14px', color: '#6b7280', marginTop: '4px'}}>Manage your store's page content and policies</p>
        </div>

        {/* About Us Section */}
        <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
            <div style={{width: '36px', height: '36px', borderRadius: '8px', background: '#16a34a15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <i className="ri-building-line" style={{fontSize: '18px', color: '#16a34a'}}></i>
            </div>
            <div>
              <h3 style={{fontSize: '16px', fontWeight: 600, color: '#0f172a'}}>About Us</h3>
              <p style={{fontSize: '12px', color: '#6b7280'}}>Tell customers about your business</p>
            </div>
          </div>
          <textarea
            placeholder="Write about your company, mission, and values..."
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              minHeight: '150px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* Terms & Conditions Section */}
        <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
            <div style={{width: '36px', height: '36px', borderRadius: '8px', background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <i className="ri-file-list-3-line" style={{fontSize: '18px', color: '#f59e0b'}}></i>
            </div>
            <div>
              <h3 style={{fontSize: '16px', fontWeight: 600, color: '#0f172a'}}>Terms & Conditions</h3>
              <p style={{fontSize: '12px', color: '#6b7280'}}>Rules and guidelines for using your service</p>
            </div>
          </div>
          <textarea
            placeholder="Define your terms of service, usage rules, and policies..."
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              minHeight: '150px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* Refund Policy Section */}
        <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
            <div style={{width: '36px', height: '36px', borderRadius: '8px', background: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <i className="ri-exchange-line" style={{fontSize: '18px', color: '#ef4444'}}></i>
            </div>
            <div>
              <h3 style={{fontSize: '16px', fontWeight: 600, color: '#0f172a'}}>Refund Policy</h3>
              <p style={{fontSize: '12px', color: '#6b7280'}}>Return and refund guidelines for customers</p>
            </div>
          </div>
          <textarea
            placeholder="Explain your refund and return policies..."
            value={refundPolicy}
            onChange={(e) => setRefundPolicy(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              minHeight: '150px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* Privacy Policy Section */}
        <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
            <div style={{width: '36px', height: '36px', borderRadius: '8px', background: '#8b5cf615', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <i className="ri-shield-user-line" style={{fontSize: '18px', color: '#8b5cf6'}}></i>
            </div>
            <div>
              <h3 style={{fontSize: '16px', fontWeight: 600, color: '#0f172a'}}>Privacy Policy</h3>
              <p style={{fontSize: '12px', color: '#6b7280'}}>How you handle and protect customer data</p>
            </div>
          </div>
          <textarea
            placeholder="Describe how you collect, use, and protect customer information..."
            value={privacyPolicy}
            onChange={(e) => setPrivacyPolicy(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              minHeight: '150px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveContent}
          disabled={saving}
          style={{
            background: saving ? '#9ca3af' : '#16a34a',
            color: '#ffffff',
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            width: '100%',
            fontSize: '15px',
            transition: 'background 0.2s'
          }}
        >
          <i className="ri-save-line"></i>
          {saving ? 'Saving...' : 'Save All Content'}
        </button>
      </div>
    </div>
  )
}

export default PageContentView
