<?php
// Script de teste para verificar se o ambiente está funcionando
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Testar conexão com o banco de dados
require_once __DIR__ . "/../config/db.php";

// Verificar se a conexão foi bem sucedida
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro de conexão: ' . $conn->connect_error]);
    exit;
}

// Testar se a tabela assuntos existe
$table_check = $conn->query("SHOW TABLES LIKE 'assuntos'");
if ($table_check->num_rows == 0) {
    echo json_encode(['success' => false, 'message' => 'A tabela "assuntos" não existe no banco de dados']);
    exit;
}

// Testar uma consulta simples para ver os campos da tabela
$columns_check = $conn->query("SHOW COLUMNS FROM assuntos");
$columns = [];
while ($row = $columns_check->fetch_assoc()) {
    $columns[] = $row['Field'];
}

// Verificar se os campos esperados existem
$expected_columns = ['id', 'nome', 'criado_em'];
$missing_columns = [];
foreach ($expected_columns as $col) {
    if (!in_array($col, $columns)) {
        $missing_columns[] = $col;
    }
}

if (!empty($missing_columns)) {
    echo json_encode(['success' => false, 'message' => 'Campos ausentes na tabela assuntos: ' . implode(', ', $missing_columns), 'available_columns' => $columns]);
    exit;
}

// Tudo OK, retornar informações da tabela
echo json_encode([
    'success' => true,
    'message' => 'Conexão e estrutura da tabela OK',
    'available_columns' => $columns,
    'method' => $_SERVER['REQUEST_METHOD'],
    'timestamp' => date('Y-m-d H:i:s')
]);
?>