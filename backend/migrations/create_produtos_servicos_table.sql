-- Migration para criar a tabela produtos_servicos_financeiro

CREATE TABLE IF NOT EXISTS produtos_servicos_financeiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    codigo_barras VARCHAR(100) UNIQUE,
    finalidade VARCHAR(20) DEFAULT 'venda',
    nome VARCHAR(255) NOT NULL,
    tipo ENUM('produto', 'servico') NOT NULL,
    tipo_unidade VARCHAR(10) DEFAULT 'UN',
    estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    estoque_atual DECIMAL(10, 2) DEFAULT 0,
    custo DECIMAL(10, 2) DEFAULT 0,
    margem DECIMAL(5, 2) DEFAULT 0,
    preco DECIMAL(10, 2) DEFAULT 0,
    observacoes TEXT,
    ncm VARCHAR(10),
    peso_liquido DECIMAL(8, 3),
    peso_bruto DECIMAL(8, 3),
    cest VARCHAR(7),
    beneficio_fiscal VARCHAR(255),
    ativo TINYINT(1) DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    removido_em TIMESTAMP NULL DEFAULT NULL,
    removido_por INT NULL,
    
    INDEX idx_empresa_codigo (empresa_id, codigo),
    INDEX idx_tipo (tipo),
    INDEX idx_codigo_barras (codigo_barras),
    INDEX idx_nome (nome),
    INDEX idx_removido_em (removido_em),
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);