<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bon de livraison</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; color:#222; font-size:14px; }
    h1 { margin: 0 0 4px 0; font-size: 40px; letter-spacing: 0.5px; }
    .muted { color: #6b7280; }
    .block { margin-top: 24px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
    th, td { border:1px solid #ddd; padding:10px; text-align:left; }
    th { background:#f5f5f5; }
    .line { margin-top: 28px; border-bottom:1px solid #666; width: 55%; }
  </style>
</head>
<body>
  <h1>PRIME Gaming</h1>
  <div class="muted">BON DE LIVRAISON</div>

  <div style="margin-top:8px;font-size:34px;font-weight:700;">Commande: #{{ $order->id }}</div>
  <div style="margin-top:2px;"><strong>Référence:</strong> ORD-{{ strtoupper(dechex($order->id)) }}{{ strtoupper(substr(md5((string)$order->id), 0, 8)) }}</div>
  <div><strong>Date de génération:</strong> {{ $generatedAt->format('Y-m-d H:i:s') }}</div>

  <div class="block">
    <div><strong>Client:</strong> {{ $order->user->name ?? '—' }}</div>
    <div><strong>Email:</strong> {{ $order->user->email ?? '—' }}</div>
    <div><strong>Téléphone:</strong> {{ $order->shippingAddress->phone ?? '—' }}</div>
    <div><strong>Pays:</strong> {{ $order->shippingAddress->country ?? '—' }}</div>
    <div><strong>Ville:</strong> {{ $order->shippingAddress->city ?? '—' }}</div>
    <div><strong>Adresse:</strong> {{ $order->shippingAddress->line1 ?? '—' }}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th>Quantité</th>
        <th>SKU</th>
      </tr>
    </thead>
    <tbody>
      @foreach($order->items as $item)
        <tr>
          <td>{{ $item->name }}</td>
          <td>{{ $item->qty }}</td>
          <td>{{ $item->sku ?? '—' }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <div class="block">
    <div><strong>Total colis:</strong> {{ $order->items->count() }}</div>
    <div><strong>Total items:</strong> {{ $order->items->sum('qty') }}</div>
    <div><strong>Livraison estimée:</strong> {{ $etaDays }} jours ({{ $deliveryStatus }})</div>
  </div>

  <div class="line"></div>
  <div style="margin-top:8px;">Nom & signature du client</div>
  <div class="line" style="margin-top:20px;"></div>
  <div style="margin-top:8px;">Nom livreur / signature</div>
  <div class="line" style="margin-top:20px;"></div>
  <div style="margin-top:8px;">PRIME Gaming - Signature officielle</div>
</body>
</html>
