<?php
/**
 * API de Empresas
 * Sistema de Gerenciamento de Atendimentos
 */

// Headers CORS mais permissivos - DEVE ser a primeira coisa no arquivo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Empresa-ID");
header("Access-Control-Max-Age: 86400");

// Definir o content-type após verificar se é uma requisição com FormData
if (!empty($_FILES) || !empty($_POST)) {
    // Se houver arquivos ou dados POST, não definir content-type
} else {
    header("Content-Type: application/json; charset=UTF-8");
}

// Tratar requisições OPTIONS (preflight)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Habilitar exibição de erros para debug
ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

// Definir modo de desenvolvimento
define("DEVELOPMENT_MODE", true);

// Incluir configurações
require_once __DIR__ . "/../config/db.php";

// Roteamento das requisições
$method = $_SERVER["REQUEST_METHOD"];

switch ($method) {
    case "GET":
        $id = $_GET["id"] ?? null;
        handleGet($conn, $id);
        break;

    case "POST":
        // Determinar se é uma criação ou atualização
        $operation = $_POST['operation'] ?? 'create';
        error_log("[EMPRESAS][POST] Operação: " . $operation);
        error_log("[EMPRESAS][POST] POST data: " . print_r($_POST, true));
        error_log("[EMPRESAS][POST] FILES data: " . print_r($_FILES, true));

        if ($operation === 'update') {
            handlePut($conn, $_POST);
        } else {
            handlePost($conn, $_POST);
        }
        break;
        
        // Tentar ler dados do PUT
        $putData = file_get_contents("php://input");
        error_log("[EMPRESAS][PUT] PUT raw data: " . $putData);
        
        $input = [];
        
        // Se tiver dados POST, usar eles
        if (!empty($_POST)) {
            error_log("[EMPRESAS][PUT] Usando dados do POST");
            $input = $_POST;
        } 
        // Se não, tentar decodificar JSON do body
        else if (!empty($putData)) {
            error_log("[EMPRESAS][PUT] Tentando decodificar JSON do body");
            $input = json_decode($putData, true);
        }
        
        if (empty($input)) {
            error_log("[EMPRESAS][PUT] Nenhum dado válido recebido");
            responderErro("Dados de entrada inválidos ou não fornecidos", 400);
        }
        
        error_log("[EMPRESAS][PUT] Dados finais para processamento: " . print_r($input, true));
        handlePut($conn, $input);
        break;

    case "DELETE":
        $id = $_GET["id"] ?? null;
        handleDelete($conn, $id);
        break;
    
    default:
        responderErro("Método não permitido", 405);
        break;
}

/**
 * Listar empresas ou buscar por ID
 */
function handleGet($conn, $id) {
    try {
        if ($id) {
            // Buscar empresa específica - APENAS CAMPOS QUE EXISTEM
            $stmt = $conn->prepare("
                SELECT 
                    id, 
                    cnpj, 
                    razao_social, 
                    nome_fantasia, 
                    logradouro, 
                    numero, 
                    bairro, 
                    cidade, 
                    estado, 
                    cep, 
                    telefone, 
                    email, 
                    inscricao_municipal, 
                    inscricao_estadual, 
                    logomarca, 
                    custo_operacional_dia,
                    custo_operacional_semana, 
                    custo_operacional_mes, 
                    custo_operacional_ano, 
                    ativo
                FROM empresas WHERE id = ?
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $empresa = $result->fetch_assoc();
            
            if (!$empresa) {
                responderErro("Empresa não encontrada", 404);
            }

            // Garante que o status seja retornado como um número
            $empresa["ativo"] = (int)$empresa["ativo"];
            
            responderSucesso("Empresa encontrada", $empresa);
            
        } else {
            // Listar todas as empresas - AGORA RETORNANDO OS CAMPOS CORRETOS
            $filtro_status = isset($_GET["status"]) && $_GET["status"] === "ativo" ? " AND ativo = 1" : "";

            $stmt = $conn->prepare("
                SELECT 
                    id, 
                    cnpj, 
                    razao_social,
                    nome_fantasia AS nome,
                    logradouro, 
                    numero, 
                    bairro, 
                    cidade, 
                    estado, 
                    cep, 
                    telefone, 
                    email, 
                    inscricao_municipal, 
                    inscricao_estadual, 
                    logomarca, 
                    custo_operacional_dia,
                    custo_operacional_semana, 
                    custo_operacional_mes, 
                    custo_operacional_ano, 
                    ativo
                FROM empresas
                WHERE removido_em IS NULL {$filtro_status}
                ORDER BY id DESC
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $empresas = $result->fetch_all(MYSQLI_ASSOC);
            
            foreach ($empresas as &$empresa) {
                $empresa["ativo"] = (int)$empresa["ativo"];
                error_log("DEBUG - Empresa disponível: ID=" . $empresa["id"] . 
                         ", Nome=" . $empresa["nome"] . 
                         ", Razão Social=" . $empresa["razao_social"]);
            }
            
            responderSucesso("Empresas listadas com sucesso", $empresas);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar empresas: " . $e->getMessage());
        responderErro("Erro ao buscar empresas: " . $e->getMessage(), 500);
    }
}

/**
 * Criar nova empresa
 */
function handlePost($conn, $input) {
    try {
        // Se os dados vierem via POST (FormData)
        if (isset($_POST['razao_social'])) {
            $input = $_POST;
            error_log("[EMPRESAS][POST] Dados recebidos via FormData");
        }

        if (!isset($input["razao_social"]) || empty(trim($input["razao_social"]))) {
            responderErro("Razão Social é obrigatória", 400);
        }

        $razao_social = trim($input["razao_social"] ?? "");
        $nome_fantasia = trim($input["nome_fantasia"] ?? "");
        $cnpj = trim($input["cnpj"] ?? "");
        $logradouro = trim($input["logradouro"] ?? "");
        $numero = trim($input["numero"] ?? "");
        $bairro = trim($input["bairro"] ?? "");
        $cidade = trim($input["cidade"] ?? "");
        $estado = trim($input["estado"] ?? "");
        $cep = trim($input["cep"] ?? "");
        $telefone = trim($input["telefone"] ?? "");
        $email = trim($input["email"] ?? "");
        $inscricao_municipal = trim($input["inscricao_municipal"] ?? "");
        $inscricao_estadual = trim($input["inscricao_estadual"] ?? "");
        $custo_operacional_dia = floatval($input["custo_operacional_dia"] ?? 0);
        $custo_operacional_semana = floatval($input["custo_operacional_semana"] ?? 0);
        $custo_operacional_mes = floatval($input["custo_operacional_mes"] ?? 0);
        $custo_operacional_ano = floatval($input["custo_operacional_ano"] ?? 0);
        $proximo_numero_orcamento = intval($input["proximo_numero_orcamento"] ?? 0);
        $modelo_orcamento = trim($input["modelo_orcamento"] ?? "");
        $ativo = intval($input["ativo"] ?? 1);

        if ($cnpj) {
            $cnpj_limpo = preg_replace("/\D/", "", $cnpj);
            if (!validarCNPJ($cnpj_limpo)) {
                responderErro("CNPJ inválido", 400);
            }
            $stmt = $conn->prepare("SELECT id FROM empresas WHERE cnpj = ? AND removido_em IS NULL");
            if (!$stmt) { responderErro("Erro na preparação da consulta: " . $conn->error, 500); }
            $stmt->bind_param("s", $cnpj_limpo);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) { responderErro("CNPJ já cadastrado para outra empresa", 409); }
            $cnpj = $cnpj_limpo;
        }

        $logomarca_path = null;
        if (isset($_FILES["logomarca"]) && $_FILES["logomarca"]["error"] === UPLOAD_ERR_OK) {
            $target_dir = __DIR__ . "/../uploads/logos/";
            if (!is_dir($target_dir)) {
                mkdir($target_dir, 0777, true);
            }
            $file_extension = pathinfo($_FILES["logomarca"]["name"], PATHINFO_EXTENSION);
            $file_name = uniqid() . "." . $file_extension;
            $target_file = $target_dir . $file_name;
            if (move_uploaded_file($_FILES["logomarca"]["tmp_name"], $target_file)) {
                $logomarca_path = $file_name;
            } else {
                error_log("Erro ao mover arquivo de logomarca.");
            }
        }

        $stmt = $conn->prepare("
            INSERT INTO empresas (
                razao_social, nome_fantasia, cnpj, logradouro, numero, bairro, cidade, estado, cep, 
                telefone, email, inscricao_municipal, inscricao_estadual, logomarca, 
                custo_operacional_dia, custo_operacional_semana, custo_operacional_mes, 
                custo_operacional_ano, proximo_numero_orcamento, modelo_orcamento, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        $stmt->bind_param("ssssssssssssssddddiis", 
            $razao_social, $nome_fantasia, $cnpj, $logradouro, $numero, $bairro, $cidade, $estado, $cep, 
            $telefone, $email, $inscricao_municipal, $inscricao_estadual, $logomarca_path, 
            $custo_operacional_dia, $custo_operacional_semana, $custo_operacional_mes, 
            $custo_operacional_ano, $proximo_numero_orcamento, $modelo_orcamento, $ativo
        );

        if ($stmt->execute()) {
            $lastId = $conn->insert_id;
            $stmt = $conn->prepare("
                SELECT 
                    id, razao_social, nome_fantasia, cnpj, logradouro, numero, bairro, cidade, estado, cep, 
                    telefone, email, inscricao_municipal, inscricao_estadual, logomarca, 
                    custo_operacional_dia, custo_operacional_semana, custo_operacional_mes, 
                    custo_operacional_ano, proximo_numero_orcamento, modelo_orcamento, ativo, 
                    criado_em, atualizado_em
                FROM empresas 
                WHERE id = ?
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $lastId);
            $stmt->execute();
            $result = $stmt->get_result();
            $empresa = $result->fetch_assoc();
            $empresa["ativo"] = (int)$empresa["ativo"];
            responderSucesso("Empresa criada com sucesso", $empresa, 201);
        } else {
            responderErro("Erro ao criar empresa: " . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao criar empresa: " . $e->getMessage());
        responderErro("Dados inválidos: " . $e->getMessage(), 400);
    }
}

/**
 * Atualizar empresa
 */
function handlePut($conn, $input) {
    try {
        error_log("[EMPRESAS][PUT] Iniciando atualização de empresa");
        error_log("[EMPRESAS][PUT] Dados recebidos: " . print_r($input, true));
        
        // Garantir que temos os dados necessários
        if (empty($input['id'])) {
            error_log("[EMPRESAS][PUT] ID não fornecido");
            responderErro("ID da empresa é obrigatório", 400);
        }
        
        if (empty($input['razao_social'])) {
            error_log("[EMPRESAS][PUT] Razão social não fornecida");
            responderErro("Razão social é obrigatória", 400);
        }
        
        if (!isset($input["id"])) {
            responderErro("ID da empresa é obrigatório", 400);
        }
        $id = $input["id"];
        
        // Verificar se a empresa existe
        $stmt = $conn->prepare("
            SELECT id, logomarca FROM empresas 
            WHERE id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $empresa = $result->fetch_assoc();
        
        if (!$empresa) {
            responderErro("Empresa não encontrada", 404);
        }
        
        // Processar upload de logo se houver
        if (isset($_FILES['logomarca']) && $_FILES['logomarca']['error'] === UPLOAD_ERR_OK) {
            $target_dir = __DIR__ . "/../uploads/logos/";
            if (!is_dir($target_dir)) {
                mkdir($target_dir, 0777, true);
            }
            
            // Remove logo antiga se existir
            if ($empresa['logomarca'] && file_exists($target_dir . $empresa['logomarca'])) {
                unlink($target_dir . $empresa['logomarca']);
            }
            
            $file_extension = strtolower(pathinfo($_FILES["logomarca"]["name"], PATHINFO_EXTENSION));
            $file_name = uniqid() . "." . $file_extension;
            $target_file = $target_dir . $file_name;
            
            if (move_uploaded_file($_FILES["logomarca"]["tmp_name"], $target_file)) {
                $input['logomarca'] = $file_name;
            } else {
                error_log("[EMPRESAS][PUT] Erro ao mover arquivo de logomarca");
            }
        } else if (isset($input['logomarca_atual'])) {
            // Mantém a logo atual
            $input['logomarca'] = $input['logomarca_atual'];
            unset($input['logomarca_atual']);
        }

        // Verificar se a empresa existe
        $stmt = $conn->prepare("
            SELECT id FROM empresas 
            WHERE id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro("Empresa não encontrada", 404);
        }

        // Preparar campos para atualização
        $fields = [];
        $params = [];
        $types = "";

        $allowed_fields = [
            "razao_social", "nome_fantasia", "cnpj", "email", "telefone",
            "logradouro", "numero", "bairro", "cidade", "estado", "cep",
            "inscricao_municipal", "inscricao_estadual", "logomarca",
            "custo_operacional_dia", "custo_operacional_semana",
            "custo_operacional_mes", "custo_operacional_ano", "proximo_numero_orcamento",
            "modelo_orcamento", "ativo"
        ];

        foreach ($input as $key => $value) {
            // Ignorar o campo 'id' pois já é usado no WHERE
            if ($key === "id") continue;

            if (in_array($key, $allowed_fields)) {
                // Validação para Razão Social, se o campo for fornecido
                if ($key === "razao_social" && empty(trim($value))) {
                    responderErro("Razão Social não pode ser vazio", 400);
                }

                if ($key === "cnpj" && $value !== null) {
                    $cnpj_limpo = preg_replace("/\D/", "", $value);
                    if (!validarCNPJ($cnpj_limpo)) {
                        responderErro("CNPJ inválido", 400);
                    }
                    // Verificar duplicidade de CNPJ para outra empresa
                    $stmtCheck = $conn->prepare("
                        SELECT id FROM empresas WHERE cnpj = ? AND id != ? AND removido_em IS NULL
                    ");
                    if (!$stmtCheck) {
                        responderErro("Erro na preparação da consulta: " . $conn->error, 500);
                    }
                    $stmtCheck->bind_param("si", $cnpj_limpo, $id);
                    $stmtCheck->execute();
                    $resCheck = $stmtCheck->get_result();
                    if ($resCheck->num_rows > 0) {
                        responderErro("CNPJ já cadastrado para outra empresa", 409);
                    }
                    $value = $cnpj_limpo;
                }

                if ($key === "ativo" || strpos($key, "custo_operacional") !== false) {
                    $types .= "d"; // double
                    $value = (double)$value;
                } else if ($key === "proximo_numero_orcamento") {
                    $types .= "i"; // integer
                    $value = (int)$value;
                } else {
                    $types .= "s"; // string
                }
                
                $fields[] = "$key = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            // Se nenhum campo válido foi fornecido para atualização, retornar sucesso sem fazer UPDATE
            responderSucesso("Nenhum campo válido para atualizar", [], 200);
        }

        // Construir SQL de update
        $sql = "UPDATE empresas SET " . implode(", ", $fields) . ", atualizado_em = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        // Adicionar tipos e parâmetros do WHERE
        $types .= "i";
        $params[] = $id;

        // Preparar bind_param com call_user_func_array
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_names[] = &$params[$i];
        }
        call_user_func_array([$stmt, "bind_param"], $bind_names);

        if (!$stmt->execute()) {
            responderErro("Erro ao atualizar empresa: " . $stmt->error, 500);
        }

        // Retornar a empresa atualizada
        $stmt = $conn->prepare("
            SELECT 
                id, razao_social, nome_fantasia, cnpj, logradouro, numero, bairro, cidade, estado, cep, 
                telefone, email, inscricao_municipal, inscricao_estadual, logomarca, 
                custo_operacional_dia, custo_operacional_semana, custo_operacional_mes, 
                custo_operacional_ano, proximo_numero_orcamento, modelo_orcamento, ativo, 
                criado_em, atualizado_em
            FROM empresas 
            WHERE id = ?
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $empresa = $result->fetch_assoc();
        $empresa["ativo"] = (int)$empresa["ativo"];

        responderSucesso("Empresa atualizada com sucesso", $empresa);

    } catch (Exception $e) {
        error_log("Erro ao atualizar empresa: " . $e->getMessage());
        responderErro("Erro ao atualizar empresa: " . $e->getMessage(), 500);
    }
}

/**
 * Remover empresa (soft delete)
 */
function handleDelete($conn, $id) {
    try {
        if (!$id) {
            responderErro("ID da empresa não fornecido na URL.", 400);
        }

        // Verificar se empresa existe
        $stmt = $conn->prepare("
            SELECT id FROM empresas 
            WHERE id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro("Empresa não encontrada ou já removida", 404);
        }

        // Soft delete - marcar removido_em
        $stmt = $conn->prepare("
            UPDATE empresas SET removido_em = NOW() WHERE id = ?
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            responderSucesso("Empresa removida com sucesso");
        } else {
            responderErro("Erro ao remover empresa: " . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao remover empresa: " . $e->getMessage());
        responderErro("Erro ao remover empresa: " . $e->getMessage(), 500);
    }
}

/**
 * Funções auxiliares para resposta da API
 */
function responderSucesso($message, $data = [], $status = 200) {
    http_response_code($status);
    echo json_encode(["success" => true, "message" => $message, "data" => $data]);
    exit();
}

function responderErro($message, $status = 400) {
    http_response_code($status);
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

/**
 * Validar CNPJ
 */
function validarCNPJ($cnpj) {
    // Remove caracteres não numéricos
    $cnpj = preg_replace("/[^0-9]/", "", $cnpj);

    // Verifica se o CNPJ tem 14 dígitos
    if (strlen($cnpj) != 14) {
        return false;
    }

    // Verifica se todos os dígitos são iguais (ex: 11.111.111/1111-11)
    if (preg_match("/(.)\1{13}/", $cnpj)) {
        return false;
    }

    // Validação dos dígitos verificadores
    for ($i = 0; $i < 2; $i++) {
        $soma = 0;
        $pos = 5 + $i;
        for ($j = 0; $j < 12 + $i; $j++) {
            $soma += $cnpj[$j] * $pos;
            $pos--;
            if ($pos < 2) {
                $pos = 9;
            }
        }
        $digito = $soma % 11 < 2 ? 0 : 11 - ($soma % 11);
        if ($cnpj[12 + $i] != $digito) {
            return false;
        }
    }

    return true;
}

// Fechar conexão com o banco de dados
$conn->close();

?>