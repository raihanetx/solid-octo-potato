import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/settings - Get settings
export async function GET() {
  try {
    // Get the first (and only) settings record
    let result = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
    
    // If no settings exist, create default settings
    if (result.length === 0) {
      const defaultSettings = await db.insert(settings).values({
        id: 1,
        websiteName: 'EcoMart',
        slogan: '',
        logoUrl: '',
        faviconUrl: '',
        heroImages: '[]',
        insideDhakaDelivery: 60,
        outsideDhakaDelivery: 120,
        freeDeliveryMin: 500,
        universalDelivery: false,
        universalDeliveryCharge: 60,
        whatsappNumber: '',
        phoneNumber: '',
        facebookUrl: '',
        messengerUsername: '',
        aboutUs: '',
        termsConditions: '',
        refundPolicy: '',
        privacyPolicy: '',
      }).returning()
      result = defaultSettings
    }
    
    return NextResponse.json({
      success: true,
      data: result[0]
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    // Check if settings exist
    const existing = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
    
    if (existing.length === 0) {
      // Create new settings
      const newSettings = await db.insert(settings).values({
        id: 1,
        websiteName: body.websiteName || 'EcoMart',
        slogan: body.slogan || '',
        logoUrl: body.logoUrl || '',
        faviconUrl: body.faviconUrl || '',
        heroImages: body.heroImages || '[]',
        insideDhakaDelivery: body.insideDhakaDelivery ?? 60,
        outsideDhakaDelivery: body.outsideDhakaDelivery ?? 120,
        freeDeliveryMin: body.freeDeliveryMin ?? 500,
        universalDelivery: body.universalDelivery ?? false,
        universalDeliveryCharge: body.universalDeliveryCharge ?? 60,
        whatsappNumber: body.whatsappNumber || '',
        phoneNumber: body.phoneNumber || '',
        facebookUrl: body.facebookUrl || '',
        messengerUsername: body.messengerUsername || '',
        aboutUs: body.aboutUs || '',
        termsConditions: body.termsConditions || '',
        refundPolicy: body.refundPolicy || '',
        privacyPolicy: body.privacyPolicy || '',
      }).returning()
      
      return NextResponse.json({
        success: true,
        data: newSettings[0]
      })
    }
    
    // Update existing settings
    const updated = await db.update(settings)
      .set({
        websiteName: body.websiteName,
        slogan: body.slogan,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        heroImages: body.heroImages,
        insideDhakaDelivery: body.insideDhakaDelivery,
        outsideDhakaDelivery: body.outsideDhakaDelivery,
        freeDeliveryMin: body.freeDeliveryMin,
        universalDelivery: body.universalDelivery,
        universalDeliveryCharge: body.universalDeliveryCharge,
        whatsappNumber: body.whatsappNumber,
        phoneNumber: body.phoneNumber,
        facebookUrl: body.facebookUrl,
        messengerUsername: body.messengerUsername,
        aboutUs: body.aboutUs,
        termsConditions: body.termsConditions,
        refundPolicy: body.refundPolicy,
        privacyPolicy: body.privacyPolicy,
      })
      .where(eq(settings.id, 1))
      .returning()
    
    return NextResponse.json({
      success: true,
      data: updated[0]
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
