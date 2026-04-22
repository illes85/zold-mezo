<?php
// upload.php - Módosított verzió: támogatja a mappákba rendezést és a CORS-t
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handling preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Alapértelmezett mappa az uploads, de bővíthető pl. "quotes/before"
$subFolder = isset($_POST['folder']) ? $_POST['folder'] : '';
$uploadDir = __DIR__ . '/uploads/';

if (!empty($subFolder)) {
    // Biztonsági szűrés: csak betűk, számok és per jel engedélyezett
    $subFolder = preg_replace('/[^a-zA-Z0-9\/]/', '', $subFolder);
    $uploadDir .= $subFolder . '/';
}

// Mappaszerkezet létrehozása ha nem létezik
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Szerver hiba: Nem tudtam létrehozni a célmappát.']);
        exit;
    }
}

// Fájl ellenőrzése
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nincs küldött fájl vagy hiba történt.']);
    exit;
}

$file = $_FILES['image'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Érvénytelen fájltípus.']);
    exit;
}

$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
if (empty($extension)) $extension = 'jpg';

$filename = uniqid('img_') . '.' . $extension;
$destination = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    // Visszaadjuk a teljes relatív URL-t a weboldal gyökerétől
    $url = '/uploads/' . (!empty($subFolder) ? $subFolder . '/' : '') . $filename;
    echo json_encode(['success' => true, 'url' => $url]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'A fájl mentése sikertelen.']);
}
?>
