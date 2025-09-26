<?php
/**
 * API de Login
 * Sistema de Gerenciamento de Atendimentos
 */

// Habilitar exibição de erros para debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir modo de desenvolvimento
define('DEVELOPMENT_MODE', true);

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");

// A URL de origem da sua requisição é obtida a partir do cabeçalho HTTP_ORIGIN
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;

// Lista de origens permitidas
$allowed_origins = [
    'http://localhost:3000', // Ambiente de desenvolvimento
    'https://investsolucoesdigitais.com.br' // Ambiente de produção
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    // Para fins de desenvolvimento ou para evitar problemas, pode usar '*'
    // header("Access-Control-Allow-Origin: *");
    http_response_code(403);
    echo json_encode(['error' => 'Origem não permitida']);
    exit();
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With, X-Request-ID");
header("Access-Control-Allow-Credentials: true");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir configurações
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Apenas aceitar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderErro('Método não permitido', 405);
}

try {
    handleLogin($conn);
} catch (Exception $e) {
    error_log("Erro na API de login: " . $e->getMessage());
    responderErro('Erro interno do servidor', 500);
}

/**
 * Processar login do usuário
 */
function handleLogin($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        // Validar dados obrigatórios
        if (!$input || !isset($input['email']) || empty(trim($input['email']))) {
            responderErro('Email é obrigatório', 400);
        }
        if (!isset($input['password']) || empty(trim($input['password']))) {
            responderErro('Senha é obrigatória', 400);
        }

        $email = strtolower(trim($input['email']));
        $password = trim($input['password']);

        // Validar formato do email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            responderErro('Email inválido', 400);
        }

        // Buscar usuário pelo email
        $stmt = $conn->prepare("
            SELECT id, nome, email, senha, perfil, bloqueado, foto
            FROM usuarios 
            WHERE email = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $usuario = $result->fetch_assoc();

        // Verificar se usuário existe
        if (!$usuario) {
            responderErro('Email ou senha inválidos', 401);
        }

        // Verificar se usuário está bloqueado
        if ($usuario['bloqueado']) {
            responderErro('Usuário bloqueado. Entre em contato com o administrador', 403);
        }

        // Verificar senha
        if (!password_verify($password, $usuario['senha'])) {
            responderErro('Email ou senha inválidos', 401);
        }

        // Atualizar último acesso (opcional)
        $stmtUpdate = $conn->prepare("
            UPDATE usuarios SET atualizado_em = NOW() WHERE id = ?
        ");
        if ($stmtUpdate) {
            $stmtUpdate->bind_param("i", $usuario['id']);
            $stmtUpdate->execute();
        }

        // Preparar dados do usuário para retorno (sem a senha)
        $userData = [
            'id' => $usuario['id'],
            'nome' => $usuario['nome'],
            'email' => $usuario['email'],
            'perfil' => $usuario['perfil'],
            'foto' => $usuario['foto']
        ];

        // Resposta de sucesso
        responderSucesso('Login realizado com sucesso', [
            'usuario' => $userData,
            'token' => generateToken($usuario['id']) // Opcional: gerar token JWT
        ]);

    } catch (Exception $e) {
        error_log("Erro no login: " . $e->getMessage());
        responderErro('Erro ao processar login: ' . $e->getMessage(), 500);
    }
}

/**
 * Gerar token simples (opcional - pode ser substituído por JWT)
 */
function generateToken($userId) {
    return base64_encode($userId . ':' . time() . ':' . bin2hex(random_bytes(16)));
}