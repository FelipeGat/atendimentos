<?php
// Habilitar CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Empresa-ID");
header("Content-Type: " . mime_content_type($_SERVER['DOCUMENT_ROOT'] . "/atendimentos/backend/uploads/logos/" . basename($_SERVER['REQUEST_URI'])));

// Servir o arquivo
$file = $_SERVER['DOCUMENT_ROOT'] . "/atendimentos/backend/uploads/logos/" . basename($_SERVER['REQUEST_URI']);
if (file_exists($file)) {
    readfile($file);
} else {
    http_response_code(404);
    echo "File not found.";
}