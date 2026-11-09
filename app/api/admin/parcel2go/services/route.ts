import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/admin-auth";
import { parcel2GoConfigured, quoteParcel2Go } from "@/lib/server/parcel2go";
import { cleanBookingSettings } from "@/lib/server/parcel2go-booking";

export const dynamic = "force-dynamic";

// A UK address to price a sample parcel to when the admin doesn't give one.
const SAMPLE_DELIVERY_POSTCODE = "M1 1AE";

/**
 * Live Parcel2Go prices for the admin's parcel size, from their collection
 * postcode, so they can pick a courier service. Quoting books nothing.
 */
export const POST = adminRoute(async (request: NextRequest) => {
  if (!parcel2GoConfigured()) {
    return NextResponse.json({ error: "Parcel2Go isn't connected (PARCEL2GO_CLIENT_ID / PARCEL2GO_CLIENT_SECRET)." }, { status: 400 });
  }
  const settings = cleanBookingSettings(await request.json().catch(() => null));
  const postcode = settings.sender.postcode;
  if (!postcode) return NextResponse.json({ error: "Add the collection postcode first." }, { status: 400 });

  try {
    const quotes = await quoteParcel2Go({
      collection: { Country: "GBR", Postcode: postcode },
      delivery: { Country: "GBR", Postcode: SAMPLE_DELIVERY_POSTCODE },
      parcel: { value: 30, ...settings.parcel },
    });
    const services = quotes
      .filter((quote) => quote.Service?.Slug)
      .map((quote) => ({
        slug: quote.Service.Slug,
        // "Royal Mail 48 Tracked Small" already names its courier; "ParcelShop (API)" doesn't.
        name: quote.Service.Name.startsWith(quote.Service.CourierName)
          ? quote.Service.Name
          : `${quote.Service.CourierName} — ${quote.Service.Name}`,
        price: quote.TotalPrice,
        collection: quote.Service.CollectionType ?? null,
        delivery: quote.Service.DeliveryType ?? null,
        speed: quote.Service.Classification ?? null,
        printerRequired: Boolean(quote.Service.IsPrinterRequired),
        estimatedDelivery: quote.EstimatedDeliveryDate ?? null,
      }))
      .sort((a, b) => a.price - b.price);
    return NextResponse.json({ services });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not get prices from Parcel2Go." }, { status: 502 });
  }
});
