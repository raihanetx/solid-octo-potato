import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { reviews } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/reviews - Get reviews by product ID or all reviews
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    
    if (productId) {
      // Get reviews for specific product
      const productReviews = await db.select()
        .from(reviews)
        .where(eq(reviews.productId, parseInt(productId)))
        .orderBy(desc(reviews.id))
      
      return NextResponse.json({
        success: true,
        data: productReviews
      })
    }
    
    // Get all reviews with product info
    const allReviews = await db.select()
      .from(reviews)
      .orderBy(desc(reviews.id))
    
    return NextResponse.json({
      success: true,
      data: allReviews,
      count: allReviews.length
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Create new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const newReview = await db.insert(reviews).values({
      initials: body.initials || body.name?.substring(0, 2).toUpperCase() || 'AN',
      name: body.name,
      rating: body.rating,
      text: body.text,
      date: body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      productId: body.productId,
      customerId: body.customerId,
    }).returning()
    
    return NextResponse.json({
      success: true,
      data: newReview[0]
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews - Delete review
export async function DELETE(request: NextRequest) {
  try {
    // Authentication disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session || !session.user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }
    
    const deleted = await db.delete(reviews)
      .where(eq(reviews.id, parseInt(id)))
      .returning()
    
    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
