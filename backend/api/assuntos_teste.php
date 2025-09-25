<?php
// Teste de resposta direta
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Teste direto sem includes
echo json_encode([
    'success' => true,
    'message' => 'Teste GET bem-sucedido.',
    'data' => [
        ['id' => 1, 'nome' => 'Teste 1', 'criado_em' => '2025-09-25 12:00:00'],
        ['id' => 2, 'nome' => 'Teste 2', 'criado_em' => '2025-09-25 12:01:00']
    ],
    'timestamp' => date('Y-m-d H:i:s')
]);
?>