import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { productFaqs } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/product-faqs - Get FAQs by product ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const faqs = await db.select()
      .from(productFaqs)
      .where(eq(productFaqs.productId, parseInt(productId)))
      .orderBy(asc(productFaqs.sortOrder))
    
    return NextResponse.json({
      success: true,
      data: faqs
    })
  } catch (error) {
    console.error('Error fetching product FAQs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product FAQs' },
      { status: 500 }
    )
  }
}

// POST /api/product-faqs - Create new FAQ(s)
export async function POST(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    // Support single FAQ or array of FAQs
    const faqsData = Array.isArray(body) ? body : [body]
    
    const created = await db.insert(productFaqs).values(
      faqsData.map((faq: any, index: number) => ({
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder ?? index,
        productId: faq.productId,
      }))
    ).returning()
    
    return NextResponse.json({
      success: true,
      data: created
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating product FAQs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create product FAQs' },
      { status: 500 }
    )
  }
}

// DELETE /api/product-faqs - Delete FAQs for a product
export async function DELETE(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const deleted = await db.delete(productFaqs)
      .where(eq(productFaqs.productId, parseInt(productId)))
      .returning()
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} FAQs`
    })
  } catch (error) {
    console.error('Error deleting product FAQs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product FAQs' },
      { status: 500 }
    )
  }
}
