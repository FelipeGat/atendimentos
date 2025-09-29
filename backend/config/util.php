<?php
/**
 * Funções de resposta padronizadas
 * Mantém compatibilidade total com código existente
 */
if (!function_exists('responderSucesso')) {
    function responderSucesso($mensagem, $dados = [], $status = 200) {
        http_response_code($status);
        echo json_encode([
            "success" => true,
            "message" => $mensagem,
            "data" => $dados
        ]);
        exit();
    }
}

if (!function_exists('responderErro')) {
    function responderErro($mensagem, $status = 500) {
        http_response_code($status);
        echo json_encode([
            "success" => false,
            "message" => $mensagem
        ]);
        exit();
    }
}

if (!function_exists('obterEmpresaId')) {
    function obterEmpresaId() {
        $headers = getallheaders();
        return $headers["X-Empresa-ID"] ?? null;
    }
}
?>

