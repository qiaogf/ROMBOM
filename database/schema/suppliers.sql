-- 供应商表
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE COMMENT '供应商名称',
    contact_person VARCHAR(100) COMMENT '联系人',
    contact_email VARCHAR(100) COMMENT '联系邮箱',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    address VARCHAR(500) COMMENT '地址',
    city VARCHAR(100) COMMENT '城市',
    state VARCHAR(100) COMMENT '省份/州',
    postal_code VARCHAR(20) COMMENT '邮编',
    country VARCHAR(100) COMMENT '国家',
    payment_terms VARCHAR(100) COMMENT '付款条款',
    lead_time_days INT COMMENT '交货期(天)',
    min_order_quantity INT COMMENT '最小订购量',
    rating DECIMAL(3, 1) COMMENT '评分(0-5)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) COMMENT='供应商信息表';

-- 供应商价格表
CREATE TABLE supplier_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    product_id BIGINT NOT NULL,
    supplier_sku VARCHAR(50) COMMENT '供应商SKU',
    unit_price DECIMAL(10, 2) NOT NULL,
    min_quantity INT COMMENT '最小数量',
    effective_date DATE COMMENT '生效日期',
    expiry_date DATE COMMENT '过期日期',
    currency VARCHAR(3) DEFAULT 'USD' COMMENT '货币',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY uk_supplier_product (supplier_id, product_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_product (product_id)
) COMMENT='供应商价格表';
