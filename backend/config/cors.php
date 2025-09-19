<?php

/**
 * Configuração de CORS para permitir requisições do frontend
 */

// Permitir requisições de qualquer origem (em produção, especificar domínios específicos)
header("Access-Control-Allow-Origin: *");

// Permitir métodos HTTP específicos
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// Permitir cabeçalhos específicos
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID");

// Permitir credenciais (se necessário)
header("Access-Control-Allow-Credentials: true");

// Responder a requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

?>
