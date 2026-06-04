-- 物料清单(BOM)表
CREATE TABLE bills_of_materials (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bom_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'BOM编号',
    parent_product_id BIGINT NOT NULL COMMENT '父产品ID',
    description VARCHAR(500) COMMENT 'BOM描述',
    version INT DEFAULT 1 COMMENT '版本',
    status ENUM('draft', 'active', 'inactive') DEFAULT 'draft' COMMENT '状态',
    created_by INT COMMENT '创建人ID',
    effective_date DATE COMMENT '生效日期',
    obsolete_date DATE COMMENT '停用日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_product_id) REFERENCES products(id),
    INDEX idx_parent_product (parent_product_id),
    INDEX idx_status (status)
) COMMENT='物料清单主表';

-- BOM明细表
CREATE TABLE bom_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bom_id BIGINT NOT NULL,
    component_product_id BIGINT NOT NULL COMMENT '组件产品ID',
    sequence_number INT COMMENT '序号',
    quantity DECIMAL(10, 4) NOT NULL COMMENT '数量',
    unit_of_measure VARCHAR(20) COMMENT '计量单位',
    scrap_factor DECIMAL(5, 2) DEFAULT 1.0 COMMENT '损耗系数',
    lead_time_days INT COMMENT '交货期',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES bills_of_materials(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id),
    INDEX idx_bom (bom_id),
    INDEX idx_component (component_product_id)
) COMMENT='BOM明细表';
