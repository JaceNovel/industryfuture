<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <title>Preuve de retrait</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111; font-size: 13px; }
        .header { margin-bottom: 20px; }
        .title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .sub { color: #555; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-top: 14px; }
        .row { margin-bottom: 8px; }
        .label { display: inline-block; width: 170px; color: #666; }
        .value { font-weight: 600; }
        .footer { margin-top: 26px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Preuve de demande de retrait</div>
        <div class="sub">Document généré le {{ $generatedAt->format('d/m/Y H:i') }}</div>
    </div>

    <div class="card">
        <div class="row"><span class="label">Référence:</span> <span class="value">RET-{{ str_pad((string) $withdrawal->id, 6, '0', STR_PAD_LEFT) }}</span></div>
        <div class="row"><span class="label">Admin:</span> <span class="value">{{ $withdrawal->user?->name ?? '—' }}</span></div>
        <div class="row"><span class="label">Email:</span> <span class="value">{{ $withdrawal->user?->email ?? '—' }}</span></div>
        <div class="row"><span class="label">Réseau Mobile Money:</span> <span class="value">{{ strtoupper($withdrawal->provider) }}</span></div>
        <div class="row"><span class="label">Numéro de retrait:</span> <span class="value">{{ $withdrawal->phone_number }}</span></div>
        <div class="row"><span class="label">Montant:</span> <span class="value">{{ number_format((float) $withdrawal->amount, 0, ',', ' ') }} FCFA</span></div>
        <div class="row"><span class="label">Statut:</span> <span class="value">{{ strtoupper($withdrawal->status) }}</span></div>
        <div class="row"><span class="label">Date de demande:</span> <span class="value">{{ optional($withdrawal->requested_at)->format('d/m/Y H:i') ?? '—' }}</span></div>
        <div class="row"><span class="label">Note:</span> <span class="value">{{ $withdrawal->note ?: 'Aucune' }}</span></div>
    </div>

    <div class="footer">
        Cette preuve confirme qu'une demande de retrait a été enregistrée dans l'administration.
    </div>
</body>
</html>
