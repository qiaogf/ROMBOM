-- 客户表
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT '客户名称',
    email VARCHAR(100) COMMENT '电子邮箱',
    phone VARCHAR(20) COMMENT '电话',
    company_name VARCHAR(255) COMMENT '公司名称',
    industry VARCHAR(100) COMMENT '行业',
    address VARCHAR(500) COMMENT '地址',
    city VARCHAR(100) COMMENT '城市',
    state VARCHAR(100) COMMENT '省份/州',
    postal_code VARCHAR(20) COMMENT '邮编',
    country VARCHAR(100) COMMENT '国家',
    customer_type ENUM('individual', 'business') DEFAULT 'individual' COMMENT '客户类型',
    credit_limit DECIMAL(12, 2) COMMENT '信用额度',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '客户状态',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_purchase_date DATETIME COMMENT '最后购买日期',
    total_purchases DECIMAL(15, 2) DEFAULT 0 COMMENT '总采购金额',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status)
) COMMENT='客户信息表';

-- 客户等级表
CREATE TABLE customer_tiers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    tier_name VARCHAR(50) COMMENT '等级名称',
    discount_percentage DECIMAL(5, 2) COMMENT '折扣百分比',
    from_date DATE,
    to_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id)
) COMMENT='客户等级表';
