-- 价格政策表
CREATE TABLE pricing_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '政策名称',
    description VARCHAR(500) COMMENT '描述',
    policy_type ENUM('fixed', 'tiered', 'percentage') COMMENT '政策类型',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='价格政策表';

-- 分级定价表
CREATE TABLE tiered_pricing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    min_quantity INT COMMENT '最小数量',
    max_quantity INT COMMENT '最大数量',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_product (product_id),
    INDEX idx_quantity (min_quantity, max_quantity)
) COMMENT='分级定价表';

-- 促销表
CREATE TABLE promotions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '促销名称',
    description VARCHAR(500) COMMENT '描述',
    promo_code VARCHAR(50) COMMENT '促销代码',
    discount_type ENUM('percentage', 'fixed_amount', 'free_shipping') COMMENT '折扣类型',
    discount_value DECIMAL(10, 2) COMMENT '折扣值',
    min_purchase_amount DECIMAL(10, 2) COMMENT '最小购买金额',
    max_usage_count INT COMMENT '最大使用次数',
    current_usage_count INT DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_promo_code (promo_code),
    INDEX idx_active (is_active)
) COMMENT='促销表';
