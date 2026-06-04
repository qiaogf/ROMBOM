-- 产品表
CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL COMMENT '产品SKU',
    name VARCHAR(255) NOT NULL COMMENT '产品名称',
    description LONGTEXT COMMENT '产品描述',
    category_id INT NOT NULL COMMENT '分类ID',
    supplier_id INT NOT NULL COMMENT '供应商ID',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    cost_price DECIMAL(10, 2) COMMENT '成本价',
    current_stock INT DEFAULT 0 COMMENT '当前库存',
    reorder_level INT COMMENT '重新订购水位',
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active' COMMENT '产品状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status)
) COMMENT='产品信息表';

-- 产品分类表
CREATE TABLE product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '分类名称',
    parent_id INT COMMENT '父分类ID',
    description VARCHAR(500) COMMENT '分类描述',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id)
) COMMENT='产品分类表';

-- 产品属性表
CREATE TABLE product_attributes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    attr_name VARCHAR(100) NOT NULL COMMENT '属性名',
    attr_value VARCHAR(255) COMMENT '属性值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
) COMMENT='产品属性表';

-- 库存记录表
CREATE TABLE inventory_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    transaction_type ENUM('in', 'out', 'adjustment', 'return') COMMENT '交易类型',
    quantity INT NOT NULL COMMENT '数量',
    reference_type VARCHAR(50) COMMENT '参考类型（订单号等）',
    reference_id VARCHAR(50) COMMENT '参考ID',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_product (product_id),
    INDEX idx_created_at (created_at)
) COMMENT='库存交易日志表';
