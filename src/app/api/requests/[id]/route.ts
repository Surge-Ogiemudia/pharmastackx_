
import { NextResponse, NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import RequestModel from '@/models/Request';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Helper to verify the user's session token
async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

// GET a single dispatch request and its quotes
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const session = await getSession(req);
    if (!session?.userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    try {
        const params = await paramsPromise; 
        const dispatchRequest = await RequestModel.findById(params.id)
            .populate({
                path: 'quotes.pharmacy', // Populate the user who made the quote (a pharmacist)
                model: User,
                populate: {
                    path: 'pharmacy', // **NESTED POPULATE**: Now populate the pharmacy linked to the pharmacist
                    model: User,
                    select: 'businessName businessAddress businessCoordinates' // Select the fields from the main pharmacy doc
                }
            });

        if (!dispatchRequest) {
            return NextResponse.json({ message: 'Request not found' }, { status: 404 });
        }

        const aRequest = dispatchRequest.toObject();
        aRequest.quotes.forEach((q: any) => {
            if (q.pharmacy) {
                // Check if the nested pharmacy object exists (for new users)
                if (q.pharmacy.pharmacy) {
                    q.pharmacy.name = q.pharmacy.pharmacy.businessName;
                    q.pharmacy.address = q.pharmacy.pharmacy.businessAddress;
                } else {
                    // Fallback for old system where the pharmacy user quoted directly
                    q.pharmacy.name = q.pharmacy.businessName;
                    q.pharmacy.address = q.pharmacy.businessAddress;
                }
            }
        });

        return NextResponse.json(aRequest, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch request:', error);
        return NextResponse.json({ message: 'Internal Server Error', error }, { status: 500 });
    }
}


// UPDATE a dispatch request. This now handles multiple actions.
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id:string }> }) {
    const session = await getSession(req);
    if (!session?.userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const body = await req.json();
        const { action } = body;

        let shouldNotifyDelivery = false;

        const params = await paramsPromise;
        const originalRequest = await RequestModel.findById(params.id);

        if (!originalRequest) {
            return NextResponse.json({ message: 'Request not found' }, { status: 404 });
        }

        switch (action) {
            case 'submit-quote': {
                const { items, notes, coordinates } = body;
                if (!session.userId) {
                     return NextResponse.json({ message: 'Unauthorized: Only registered users can submit quotes.' }, { status: 403 });
                }
                const existingQuote = originalRequest.quotes.find(
                    (q: any) => q.pharmacy.toString() === session.userId
                );
                if (existingQuote) {
                    return NextResponse.json({ message: 'You have already submitted a quote for this request.' }, { status: 409 });
                }

                const newQuote = {
                    pharmacy: session.userId, 
                    items: items,
                    notes: notes,
                    coordinates: coordinates,
                };
                originalRequest.quotes.push(newQuote);
                break;
            }

            case 'accept-quote': {
                const { quoteId } = body;
                if (originalRequest.user.toString() !== session.userId) {
                    return NextResponse.json({ message: 'Unauthorized: You are not the owner of this request.' }, { status: 403 });
                }

                const quoteToAccept = originalRequest.quotes.find((q: any) => q._id.toString() === quoteId);

                if (!quoteToAccept) {
                    return NextResponse.json({ message: 'Quote not found.' }, { status: 404 });
                }

                originalRequest.quotes.forEach((q: any) => {
                    if (q._id.toString() === quoteId) {
                        q.status = 'accepted';
                    } else {
                        q.status = 'rejected';
                    }
                });
                
                originalRequest.status = 'awaiting-confirmation';
                break;
            }

            case 'confirm-request': {
                if (originalRequest.user.toString() !== session.userId) {
                    return NextResponse.json({ message: 'Unauthorized: You cannot confirm this request.' }, { status: 403 });
                }
                
                const { patientPhone, deliveryAddress, deliveryCoords } = body;
                if (patientPhone) originalRequest.patientPhone = patientPhone;
                if (deliveryAddress) originalRequest.deliveryAddress = deliveryAddress;
                if (deliveryCoords) originalRequest.deliveryCoords = deliveryCoords;

                originalRequest.status = 'confirmed';
                shouldNotifyDelivery = true;
                break;
            }
            
            case 'cancel-request': {
                 if (originalRequest.user.toString() !== session.userId) {
                    return NextResponse.json({ message: 'Unauthorized: You cannot cancel this request.' }, { status: 403 });
                }
                originalRequest.status = 'cancelled';
                break;
            }

            case 'stop-search': { 
                if (originalRequest.user.toString() !== session.userId) {
                   return NextResponse.json({ message: 'Unauthorized: You cannot stop this search.' }, { status: 403 });
               }
               originalRequest.status = 'search-stopped';
               break;
           }

            case 'claim-request': {
                // Allows a guest-created request to be linked to a logged-in user
                originalRequest.user = session.userId;
                break;
            }

            case 'update-quote-items': {
                const { items } = body;
                if (originalRequest.user.toString() !== session.userId) {
                    return NextResponse.json({ message: 'Unauthorized: You are not the owner of this request.' }, { status: 403 });
                }
                
                // Find the accepted quote
                const acceptedQuote = originalRequest.quotes.find((q: any) => q.status === 'accepted');
                if (!acceptedQuote) {
                    return NextResponse.json({ message: 'No accepted quote found to update.' }, { status: 404 });
                }

                // Update items in the accepted quote
                acceptedQuote.items = items;
                
                // Keep status as 'awaiting-confirmation' or 'quoted'? 
                // Usually it stays what it was (e.g. 'awaiting-confirmation')
                break;
            }

            default:
                return NextResponse.json({ message: 'Invalid action specified.' }, { status: 400 });
        }
        
        const savedRequest = await originalRequest.save();

        return NextResponse.json({ ...savedRequest.toObject(), shouldNotifyDelivery }, { status: 200 });

    } catch (error) {
        console.error('Failed to update request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}
