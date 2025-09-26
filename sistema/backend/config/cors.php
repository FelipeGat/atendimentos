<?php

/**
 * Configuração de CORS para permitir requisições do frontend
 */

// Obter a origem da requisição
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Lista de origens permitidas para desenvolvimento
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://localhost:3000',
    'https://localhost:3001'
];

// Verificar se a origem está na lista permitida ou se é desenvolvimento local
if (in_array($origin, $allowed_origins) || 
    (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    // Para desenvolvimento, permitir qualquer origem (manter comportamento atual)
    // Em produção, comentar esta linha e usar apenas origens específicas
    header("Access-Control-Allow-Origin: *");
}

// Permitir métodos HTTP específicos (mantendo os atuais + PATCH)
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");

// Permitir cabeçalhos específicos (expandindo a lista atual)
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With, Accept, Origin, Cache-Control, Pragma, X-Request-ID, x-request-id");


// Permitir credenciais (mantendo configuração atual)
header("Access-Control-Allow-Credentials: true");

// Cache para requisições preflight (melhorar performance)
header("Access-Control-Max-Age: 86400"); // 24 horas

// Headers adicionais para compatibilidade
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");

// Responder a requisições OPTIONS (preflight) - mantendo comportamento atual
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log para debug (apenas em desenvolvimento - remover em produção)
if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        error_log("CORS: Origin recebida: " . $_SERVER['HTTP_ORIGIN']);
    }
    error_log("CORS: Método: " . $_SERVER['REQUEST_METHOD']);
}

?>
