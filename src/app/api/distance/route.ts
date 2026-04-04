
import { NextResponse, NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import RequestModel from '@/models/Request';
import UserModel from '@/models/User';

// Defines the shape of the quote object after being populated with pharmacy data
interface PopulatedQuote {
  _id: string; // The ID of the quote itself
  pharmacy: {
    _id: {
      toString(): string;
    };
  };
  coordinates?: [number, number]; // [longitude, latitude]
}

// Defines the shape of the object we create for the Google Maps API
type DestinationObject = { id: string; coords: { lat: number; lon: number; } };

// Helper function to call the Google Maps Distance Matrix API
async function getTravelTimes(origin: { lat: number; lon: number }, destinations: DestinationObject[]): Promise<{ [pharmacyId: string]: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key is missing.");
    const results: { [pharmacyId: string]: string } = {};
    for (const dest of destinations) {
        results[dest.id] = "Distance calculation failed.";
    }
    return results;
  }
  if (destinations.length === 0) {
    return {};
  }

  const originStr = `${origin.lat},${origin.lon}`;
  const destinationsStr = destinations.map(d => `${d.coords.lat},${d.coords.lon}`).join('|');

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destinationsStr}&key=${apiKey}&units=metric&mode=driving`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const results: { [pharmacyId: string]: string } = {};

    if (data.status !== 'OK') {
      console.error('Error fetching travel time from Google Maps:', data.error_message || data.status);
      for (const dest of destinations) {
        results[dest.id] = "Distance calculation failed.";
      }
      return results;
    }

    const elements = data.rows[0].elements;

    elements.forEach((element: any, index: number) => {
      const pharmacyId = destinations[index].id;
      if (element.status === 'OK') {
        results[pharmacyId] = element.duration.text; // e.g., "23 mins"
      } else {
        results[pharmacyId] = "Distance calculation failed."; // Specific error as requested
      }
    });

    return results;

  } catch (error) {
    console.error("Error calling Google Maps API:", error);
    const results: { [pharmacyId: string]: string } = {};
    for (const dest of destinations) {
        results[dest.id] = "Distance calculation failed.";
    }
    return results;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');
  const userLat = searchParams.get('lat');
  const userLon = searchParams.get('lon');

  // lat and lon are now required for the user's location
  if (!requestId || !userLat || !userLon) {
    return NextResponse.json({ message: 'User location not taken. Missing required parameters: requestId, lat, and lon.' }, { status: 400 });
  }

  try {
    await dbConnect();
    
    const origin = { lat: parseFloat(userLat), lon: parseFloat(userLon) };

    const request = await RequestModel.findById(requestId)
      .populate<{ quotes: PopulatedQuote[] }>({
        path: 'quotes.pharmacy',
        model: UserModel,
        select: '_id' // Only select the ID to be efficient
      });

    if (!request) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const travelTimes: { [pharmacyId: string]: string } = {};
    const destinationsToFetch: DestinationObject[] = [];

    const populatedQuotes = request.quotes as PopulatedQuote[];

    for (const quote of populatedQuotes) {
      const pharmacyId = quote.pharmacy?._id?.toString();

      if (!pharmacyId) {
        continue; // Should not happen with valid data
      }

      // Per user instruction: only use quote.coordinates
      if (quote.coordinates && quote.coordinates.length === 2) {
        destinationsToFetch.push({
          id: pharmacyId,
          // Assuming GeoJSON order [longitude, latitude]
          coords: { lat: quote.coordinates[1], lon: quote.coordinates[0] }
        });
      } else {
        // If no coordinates, set the specific error message.
        travelTimes[pharmacyId] = "Pharmacist location not recorded.";
      }
    }

    // Fetch travel times for the destinations that had coordinates
    if (destinationsToFetch.length > 0) {
        const googleMapsResults = await getTravelTimes(origin, destinationsToFetch);
        Object.assign(travelTimes, googleMapsResults);
    }

    return NextResponse.json(travelTimes, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Internal Server Error in distance API:", errorMessage);
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

