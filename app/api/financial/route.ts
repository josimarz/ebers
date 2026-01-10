import { NextRequest, NextResponse } from 'next/server'
import { getFinancialOverview, getFinancialStats } from '@/lib/financial'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = await getFinancialStats()
      return NextResponse.json(stats)
    }
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') as 'name' | 'paymentDeficit' || 'paymentDeficit'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const search = searchParams.get('search') || undefined

    // Get financial overview
    const result = await getFinancialOverview({
      page,
      limit,
      sortBy,
      sortOrder,
      search
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in financial API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}