<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ReverseGeocodeController extends Controller
{
    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric'],
            'lon' => ['required', 'numeric'],
        ]);

        $lat = (string) $validated['lat'];
        $lon = (string) $validated['lon'];

        $res = Http::timeout(8)
            ->withHeaders([
                'User-Agent' => "IndustrieDeLAvenir/1.0 (support@futurind.space)",
                'Accept' => 'application/json',
            ])
            ->get('https://nominatim.openstreetmap.org/reverse', [
                'format' => 'jsonv2',
                'lat' => $lat,
                'lon' => $lon,
                'addressdetails' => 1,
            ]);

        if (!$res->ok()) {
            return response()->json(['message' => 'Geocoding failed'], 502);
        }

        $data = $res->json();
        $addr = $data['address'] ?? [];

        $house = trim((string) ($addr['house_number'] ?? ''));
        $road = trim((string) ($addr['road'] ?? $addr['pedestrian'] ?? $addr['neighbourhood'] ?? $addr['suburb'] ?? ''));
        $line1 = trim(($house ? $house . ' ' : '') . $road);

        $city = (string) ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? $addr['county'] ?? '');
        $postal = (string) ($addr['postcode'] ?? '');
        $country = (string) ($addr['country'] ?? '');

        if (!$line1) {
            $line1 = (string) ($data['name'] ?? $data['display_name'] ?? '');
            if (is_string($line1)) {
                $line1 = trim(explode(',', $line1)[0] ?? $line1);
            }
        }

        return response()->json([
            'line1' => $line1,
            'city' => $city,
            'postal_code' => $postal,
            'country' => $country,
        ]);
    }
}
