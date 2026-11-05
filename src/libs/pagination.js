module.exports = async (page, limit, Model, query) => {
  const totalRows = await Model.find(query).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  return {
    totalRows,
    totalPages,
    page,
    next: page + 1,
    prev: page - 1,
    hasNext: page < totalPages ? true : false,
    hasPrev: page > 1 ? true : false,
  };
};
