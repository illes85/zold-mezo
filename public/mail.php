<?php
header('Content-Type: application/json');

// Get POST data
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'No data provided']);
    exit;
}

$type = $data['type'] ?? '';
$to = "info@zold-mezo.hu";
$secondaryTo = $data['secondaryEmail'] ?? "szi.illes85@gmail.com"; 
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: Zöld-Mező <noreply@zold-mezo.hu>" . "\r\n";

if ($type === 'new_quote') {
    $subject = "Új árajánlatkérés érkezett - " . $data['customerName'];
    
    $message = "
    <html>
    <head><title>Új árajánlatkérés</title></head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
            <h2 style='color: #059669;'>Új árajánlatkérés érkezett!</h2>
            <p>Egy új érdeklődő töltötte ki az űrlapot a weboldalon.</p>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Név:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['customerName']}</td></tr>
                <tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Telefon:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['customerPhone']}</td></tr>
                <tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Szolgáltatás:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['serviceType']}</td></tr>
                <tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Munkavégzés napjai:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['preferredDays']}</td></tr>
                <tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Kalkulált ár:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee; color: #059669; font-weight: bold;'>{$data['price']} Ft</td></tr>
            </table>
            <p style='margin-top: 20px;'>A részletek és a csatolt fotók megtekintéséhez jelentkezz be az admin felületre.</p>
            <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;'>
                Ez egy automatikus értesítés a zold-mezo.hu weboldalról.
            </div>
        </div>
    </body>
    </html>
    ";

    // Send to primary
    mail($to, $subject, $message, $headers);
    // Send to secondary
    mail($secondaryTo, $subject, $message, $headers);

    echo json_encode(['success' => true]);

} elseif ($type === 'job_completed') {
    $toCustomer = $data['customerEmail'];
    if (empty($toCustomer)) {
        echo json_encode(['success' => false, 'error' => 'No customer email provided']);
        exit;
    }

    $subject = "A munka elkészült! - Zöld-Mező";
    
    // Split images
    $beforeImages = [];
    $afterImages = [];
    foreach ($data['images'] as $img) {
        if ($img['type'] === 'before') $beforeImages[] = $img['url'];
        else $afterImages[] = $img['url'];
    }

    $imgHtml = "";
    if (!empty($beforeImages) && !empty($afterImages)) {
        $imgHtml .= "<h3 style='color: #059669;'>Előtte - Utána eredmény</h3>";
        $imgHtml .= "<div style='display: flex; gap: 10px; margin-bottom: 20px;'>";
        $imgHtml .= "<div style='flex: 1;'><p style='font-size: 11px; color: #666;'>Előtte:</p><img src='{$beforeImages[0]}' style='width: 100%; border-radius: 8px;' /></div>";
        $imgHtml .= "<div style='flex: 1;'><p style='font-size: 11px; color: #666;'>Utána:</p><img src='{$afterImages[0]}' style='width: 100%; border-radius: 8px;' /></div>";
        $imgHtml .= "</div>";
    }

    $message = "
    <html>
    <head><title>Munka befejezve</title></head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
            <div style='text-align: center; margin-bottom: 20px;'>
                <img src='https://zold-mezo.hu/logo.png' style='height: 80px;' />
            </div>
            <h2 style='color: #059669;'>Kedves {$data['customerName']}!</h2>
            <p>Örömmel értesítjük, hogy a megrendelt munkafolyamatot sikeresen befejeztük. Reméljük, elégedett az eredménnyel!</p>
            
            {$imgHtml}

            <p>Munkatársaink mindent megtettek a tökéletes végeredmény érdekében. Köszönjük, hogy minket választott!</p>
            <p>Amennyiben a jövőben is szüksége lenne kertgondozásra vagy fűnyírásra, keressen minket bizalommal.</p>
            
            <div style='background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 30px;'>
                <p style='margin: 0; font-weight: bold;'>Üdvözlettel:</p>
                <p style='margin: 5px 0 0 0;'>Zöld-Mező Csapata</p>
                <p style='margin: 0; font-size: 13px; color: #666;'>www.zold-mezo.hu</p>
            </div>
        </div>
    </body>
    </html>
    ";

    mail($toCustomer, $subject, $message, $headers);
    echo json_encode(['success' => true]);

} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request type']);
}
