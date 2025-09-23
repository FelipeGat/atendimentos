<?php
class Orcamento{
    private $conn;
    private $table_name = "orcamentos";
    private $table_items_name = "orcamentos_itens";

    public $id;
    public $numero_orcamento;
    public $empresa_id;
    public $cliente_id;
    public $usuario_id;
    public $referencia;
    public $data_orcamento;
    public $validade_orcamento;
    public $prazo_inicio;
    public $prazo_duracao;
    public $observacoes;
    public $imposto_percentual;
    public $frete;
    public $desconto_valor;
    public $desconto_percentual;
    public $tipo_desconto;
    public $condicoes_pagamento;
    public $meios_pagamento;
    public $anotacoes_internas;
    public $valor_total;
    public $status;
    public $criado_em;
    public $atualizado_em;
    public $removido_em;
    public $empresa_nome;
    public $cliente_nome;

    public $servicos = [];
    public $materiais = [];

    public function __construct($db){
        $this->conn = $db;
    }

    function read($filterStatus = "", $filterStartDate = "", $filterEndDate = ""){
        $query = "SELECT 
                    o.id, o.numero_orcamento, o.empresa_id, o.cliente_id, o.usuario_id, o.referencia,
                    o.data_orcamento, o.validade_orcamento, o.prazo_inicio, o.prazo_duracao, o.observacoes,
                    o.imposto_percentual, o.frete, o.desconto_valor, o.desconto_percentual, o.tipo_desconto,
                    o.condicoes_pagamento, o.meios_pagamento, o.anotacoes_internas, o.valor_total, o.status,
                    o.criado_em, o.atualizado_em, o.removido_em,
                    e.nome as empresa_nome, c.nome as cliente_nome
                FROM " . $this->table_name . " o
                LEFT JOIN empresas e ON o.empresa_id = e.id
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.removido_em IS NULL";

        if (!empty($filterStatus)) {
            $query .= " AND o.status = :status";
        }
        if (!empty($filterStartDate)) {
            $query .= " AND o.data_orcamento >= :start_date";
        }
        if (!empty($filterEndDate)) {
            $query .= " AND o.data_orcamento <= :end_date";
        }

        $query .= " ORDER BY o.criado_em DESC";

        $stmt = $this->conn->prepare($query);

        if (!empty($filterStatus)) {
            $stmt->bindParam(":status", $filterStatus);
        }
        if (!empty($filterStartDate)) {
            $stmt->bindParam(":start_date", $filterStartDate);
        }
        if (!empty($filterEndDate)) {
            $stmt->bindParam(":end_date", $filterEndDate);
        }

        $stmt->execute();
        return $stmt;
    }

    function readOne(){
        $query = "SELECT 
                    o.id, o.numero_orcamento, o.empresa_id, o.cliente_id, o.usuario_id, o.referencia,
                    o.data_orcamento, o.validade_orcamento, o.prazo_inicio, o.prazo_duracao, o.observacoes,
                    o.imposto_percentual, o.frete, o.desconto_valor, o.desconto_percentual, o.tipo_desconto,
                    o.condicoes_pagamento, o.meios_pagamento, o.anotacoes_internas, o.valor_total, o.status,
                    o.criado_em, o.atualizado_em, o.removido_em,
                    e.nome as empresa_nome, c.nome as cliente_nome
                FROM " . $this->table_name . " o
                LEFT JOIN empresas e ON o.empresa_id = e.id
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.id = ? AND o.removido_em IS NULL
                LIMIT 0,1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            foreach ($row as $key => $value) {
                if (property_exists($this, $key)) {
                    $this->$key = $value;
                }
            }

            // Buscar itens vinculados
            $this->servicos = $this->readItemsByType('Servico');
            $this->materiais = $this->readItemsByType('Material');
        }
    }

    function readItems(){
        $query = "SELECT id, orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em
                FROM " . $this->table_items_name . "
                WHERE orcamento_id = ? AND removido_em IS NULL
                ORDER BY criado_em ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    function readItemsByType($tipo_item){
        $query = "SELECT id, orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em
                FROM " . $this->table_items_name . "
                WHERE orcamento_id = ? AND tipo_item = ? AND removido_em IS NULL
                ORDER BY criado_em ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->bindParam(2, $tipo_item);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    function create(){
        $query = "INSERT INTO " . $this->table_name . "
                SET
                    numero_orcamento=:numero_orcamento, empresa_id=:empresa_id, cliente_id=:cliente_id, usuario_id=:usuario_id,
                    referencia=:referencia, data_orcamento=:data_orcamento, validade_orcamento=:validade_orcamento,
                    prazo_inicio=:prazo_inicio, prazo_duracao=:prazo_duracao, observacoes=:observacoes,
                    imposto_percentual=:imposto_percentual, frete=:frete, desconto_valor=:desconto_valor,
                    desconto_percentual=:desconto_percentual, tipo_desconto=:tipo_desconto,
                    condicoes_pagamento=:condicoes_pagamento, meios_pagamento=:meios_pagamento,
                    anotacoes_internas=:anotacoes_internas, valor_total=:valor_total, status=:status,
                    criado_em=:criado_em";

        $stmt = $this->conn->prepare($query);

        $this->criado_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":numero_orcamento", $this->numero_orcamento);
        $stmt->bindParam(":empresa_id", $this->empresa_id);
        $stmt->bindParam(":cliente_id", $this->cliente_id);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->bindParam(":referencia", $this->referencia);
        $stmt->bindParam(":data_orcamento", $this->data_orcamento);
        $stmt->bindParam(":validade_orcamento", $this->validade_orcamento);
        $stmt->bindParam(":prazo_inicio", $this->prazo_inicio);
        $stmt->bindParam(":prazo_duracao", $this->prazo_duracao);
        $stmt->bindParam(":observacoes", $this->observacoes);
        $stmt->bindParam(":imposto_percentual", $this->imposto_percentual);
        $stmt->bindParam(":frete", $this->frete);
        $stmt->bindParam(":desconto_valor", $this->desconto_valor);
        $stmt->bindParam(":desconto_percentual", $this->desconto_percentual);
        $stmt->bindParam(":tipo_desconto", $this->tipo_desconto);
        $stmt->bindParam(":condicoes_pagamento", $this->condicoes_pagamento);
        $stmt->bindParam(":meios_pagamento", $this->meios_pagamento);
        $stmt->bindParam(":anotacoes_internas", $this->anotacoes_internas);
        $stmt->bindParam(":valor_total", $this->valor_total);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":criado_em", $this->criado_em);

        if($stmt->execute()){
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    function update(){
        $query = "UPDATE " . $this->table_name . "
                SET
                    numero_orcamento=:numero_orcamento, empresa_id=:empresa_id, cliente_id=:cliente_id, usuario_id=:usuario_id,
                    referencia=:referencia, data_orcamento=:data_orcamento, validade_orcamento=:validade_orcamento,
                    prazo_inicio=:prazo_inicio, prazo_duracao=:prazo_duracao, observacoes=:observacoes,
                    imposto_percentual=:imposto_percentual, frete=:frete, desconto_valor=:desconto_valor,
                    desconto_percentual=:desconto_percentual, tipo_desconto=:tipo_desconto,
                    condicoes_pagamento=:condicoes_pagamento, meios_pagamento=:meios_pagamento,
                    anotacoes_internas=:anotacoes_internas, valor_total=:valor_total, status=:status,
                    atualizado_em=:atualizado_em
                WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        $this->atualizado_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":numero_orcamento", $this->numero_orcamento);
        $stmt->bindParam(":empresa_id", $this->empresa_id);
        $stmt->bindParam(":cliente_id", $this->cliente_id);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->bindParam(":referencia", $this->referencia);
        $stmt->bindParam(":data_orcamento", $this->data_orcamento);
        $stmt->bindParam(":validade_orcamento", $this->validade_orcamento);
        $stmt->bindParam(":prazo_inicio", $this->prazo_inicio);
        $stmt->bindParam(":prazo_duracao", $this->prazo_duracao);
        $stmt->bindParam(":observacoes", $this->observacoes);
        $stmt->bindParam(":imposto_percentual", $this->imposto_percentual);
        $stmt->bindParam(":frete", $this->frete);
        $stmt->bindParam(":desconto_valor", $this->desconto_valor);
        $stmt->bindParam(":desconto_percentual", $this->desconto_percentual);
        $stmt->bindParam(":tipo_desconto", $this->tipo_desconto);
        $stmt->bindParam(":condicoes_pagamento", $this->condicoes_pagamento);
        $stmt->bindParam(":meios_pagamento", $this->meios_pagamento);
        $stmt->bindParam(":anotacoes_internas", $this->anotacoes_internas);
        $stmt->bindParam(":valor_total", $this->valor_total);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":atualizado_em", $this->atualizado_em);
        $stmt->bindParam(":id", $this->id);

        if($stmt->execute()){
            return true;
        }

        return false;
    }

    function delete(){
        $query = "UPDATE " . $this->table_name . " SET removido_em=:removido_em WHERE id=:id";

        $stmt = $this->conn->prepare($query);
        $this->removido_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":removido_em", $this->removido_em);

        if($stmt->execute()){
            return true;
        }

        return false;
    }

    function createItem($item){
        $query = "INSERT INTO " . $this->table_items_name . "
                SET
                    orcamento_id=:orcamento_id, tipo_item=:tipo_item, descricao=:descricao, tipo_especifico=:tipo_especifico,
                    observacao=:observacao, quantidade=:quantidade, valor_unitario=:valor_unitario, valor_total=:valor_total,
                    criado_em=:criado_em";

        $stmt = $this->conn->prepare($query);

        if (is_array($item)) {
            $item = (object) $item;
        }

        if (!isset($item->orcamento_id)) {
            $item->orcamento_id = $this->id;
        }

        $item->orcamento_id   = htmlspecialchars(strip_tags($item->orcamento_id));
        $item->tipo_item      = htmlspecialchars(strip_tags($item->tipo_item ?? ""));
        $item->descricao      = htmlspecialchars(strip_tags($item->descricao ?? ""));
        $item->tipo_especifico= htmlspecialchars(strip_tags($item->tipo_especifico ?? ""));
        $item->observacao     = htmlspecialchars(strip_tags($item->observacao ?? ""));
        $item->quantidade     = htmlspecialchars(strip_tags($item->quantidade ?? 0));
        $item->valor_unitario = htmlspecialchars(strip_tags($item->valor_unitario ?? 0));
        $item->valor_total    = htmlspecialchars(strip_tags($item->valor_total ?? 0));
        $item->criado_em      = date("Y-m-d H:i:s");

        $stmt->bindParam(":orcamento_id", $item->orcamento_id);
        $stmt->bindParam(":tipo_item", $item->tipo_item);
        $stmt->bindParam(":descricao", $item->descricao);
        $stmt->bindParam(":tipo_especifico", $item->tipo_especifico);
        $stmt->bindParam(":observacao", $item->observacao);
        $stmt->bindParam(":quantidade", $item->quantidade);
        $stmt->bindParam(":valor_unitario", $item->valor_unitario);
        $stmt->bindParam(":valor_total", $item->valor_total);
        $stmt->bindParam(":criado_em", $item->criado_em);

        return $stmt->execute();
    }

    function updateItems($orcamento_id, $items, $tipo_item) {
        // CORRIGIDO: Só deleta se houver novos itens para substituir
        if (!empty($items)) {
            $query_delete = "UPDATE " . $this->table_items_name . " SET removido_em = NOW() WHERE orcamento_id = ? AND tipo_item = ? AND removido_em IS NULL";
            $stmt_delete = $this->conn->prepare($query_delete);
            $stmt_delete->execute([$orcamento_id, $tipo_item]);
        }

        foreach ($items as $item_data) {
            $item_data["orcamento_id"] = $orcamento_id;
            $item_data["tipo_item"] = $tipo_item;
            $this->createItem($item_data);
        }
    }

    // Função para ler todos os orçamentos com paginação e filtros
    function readAllWithPagination($empresa_id, $search = '', $status = '', $cliente_id = '', $start_date = '', $end_date = '', $offset = 0, $limit = 10) {
        $query = "SELECT 
                    o.id, o.numero_orcamento, o.empresa_id, o.cliente_id, o.usuario_id, o.referencia,
                    o.data_orcamento, o.validade_orcamento, o.prazo_inicio, o.prazo_duracao, o.observacoes,
                    o.imposto_percentual, o.frete, o.desconto_valor, o.desconto_percentual, o.tipo_desconto,
                    o.condicoes_pagamento, o.meios_pagamento, o.anotacoes_internas, o.valor_total, o.status,
                    o.criado_em, o.atualizado_em, o.removido_em,
                    e.nome as empresa_nome, c.nome as cliente_nome
                FROM " . $this->table_name . " o
                LEFT JOIN empresas e ON o.empresa_id = e.id
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.empresa_id = :empresa_id AND o.removido_em IS NULL";

        $params = [":empresa_id" => $empresa_id];

        if (!empty($search)) {
            $query .= " AND (o.numero_orcamento LIKE :search OR o.referencia LIKE :search OR c.nome LIKE :search)";
            $params[":search"] = "%" . $search . "%";
        }
        if (!empty($status)) {
            $query .= " AND o.status = :status";
            $params[":status"] = $status;
        }
        if (!empty($cliente_id)) {
            $query .= " AND o.cliente_id = :cliente_id";
            $params[":cliente_id"] = $cliente_id;
        }
        if (!empty($start_date)) {
            $query .= " AND o.data_orcamento >= :start_date";
            $params[":start_date"] = $start_date;
        }
        if (!empty($end_date)) {
            $query .= " AND o.data_orcamento <= :end_date";
            $params[":end_date"] = $end_date;
        }

        $query .= " ORDER BY o.criado_em DESC LIMIT :offset, :limit";

        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => &$val) {
            $stmt->bindParam($key, $val);
        }
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt;
    }

    // Função para contar o total de orçamentos com filtros
    function countAll(
        $empresa_id, 
        $search = "", 
        $status = "", 
        $cliente_id = "", 
        $start_date = "", 
        $end_date = ""
    ) {
        $query = "SELECT COUNT(*) as total_rows 
                FROM " . $this->table_name . " o
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.empresa_id = :empresa_id AND o.removido_em IS NULL";

        $params = [":empresa_id" => $empresa_id];

        if (!empty($search)) {
            $query .= " AND (o.numero_orcamento LIKE :search OR o.referencia LIKE :search OR c.nome LIKE :search)";
            $params[":search"] = "%" . $search . "%";
        }
        if (!empty($status)) {
            $query .= " AND o.status = :status";
            $params[":status"] = $status;
        }
        if (!empty($cliente_id)) {
            $query .= " AND o.cliente_id = :cliente_id";
            $params[":cliente_id"] = $cliente_id;
        }
        if (!empty($start_date)) {
            $query .= " AND o.data_orcamento >= :start_date";
            $params[":start_date"] = $start_date;
        }
        if (!empty($end_date)) {
            $query .= " AND o.data_orcamento <= :end_date";
            $params[":end_date"] = $end_date;
        }

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => &$val) {
            $stmt->bindParam($key, $val);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row["total_rows"];
    }

}
?>