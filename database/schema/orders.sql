-- 订单表
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
    order_type ENUM('purchase', 'sales') NOT NULL COMMENT '订单类型',
    customer_id INT NOT NULL COMMENT '客户ID',
    supplier_id INT COMMENT '供应商ID(采购订单)',
    order_date DATETIME NOT NULL COMMENT '订单日期',
    required_date DATE COMMENT '所需日期',
    ship_date DATE COMMENT '发货日期',
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    subtotal DECIMAL(12, 2) COMMENT '小计',
    tax DECIMAL(10, 2) COMMENT '税',
    shipping_cost DECIMAL(10, 2) COMMENT '运费',
    total DECIMAL(12, 2) NOT NULL COMMENT '总金额',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date)
) COMMENT='订单表';

-- 订单明细表
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL COMMENT '数量',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    line_total DECIMAL(12, 2) COMMENT '行合计',
    status ENUM('pending', 'received', 'returned') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) COMMENT='订单明细表';
