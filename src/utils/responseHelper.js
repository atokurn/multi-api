/**
 * ========================================
 * Response Helper
 * ========================================
 * 
 * Utility functions untuk membuat response format yang konsisten.
 * Ini memastikan semua endpoint mengembalikan struktur yang sama.
 */

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {any} data - Data yang akan dikirim
 * @param {string} message - Pesan sukses (opsional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, data, message = 'Berhasil', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {string} message - Pesan error
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {any} error - Detail error (opsional, hanya untuk development)
 */
const errorResponse = (res, message = 'Terjadi kesalahan', statusCode = 500, error = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    // Tampilkan detail error hanya di development mode
    if (error && process.env.NODE_ENV === 'development') {
        response.error = error;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 * @param {Object} res - Express response object
 * @param {Array} data - Array data
 * @param {number} page - Halaman saat ini
 * @param {number} totalItems - Total item
 * @param {number} itemsPerPage - Item per halaman
 */
const paginatedResponse = (res, data, page = 1, totalItems = 0, itemsPerPage = 20) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return res.status(200).json({
        success: true,
        message: 'Berhasil',
        data,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        },
        timestamp: new Date().toISOString()
    });
};

export {
    successResponse,
    errorResponse,
    paginatedResponse
};

export default {
    successResponse,
    errorResponse,
    paginatedResponse
};
