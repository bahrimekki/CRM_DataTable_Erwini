
    // --- Global Variables and Initialization ---
    const BASE_URL = "https://erwini.herokuapp.com/api/administration"; // Or "http://localhost:3000/api/administration";
    let dataTableInstance = null; // Variable to hold the DataTable instance
    let currentTable = ''; // Track currently active table
    let tableSchema = {}; // Store schemaTables.json data
    let zoneIdFilterValue = ''; // Store zone ID filter value

    // --- Fetch Table Schema ---
    $.getJSON("schemaTables.json", function (data) {
    tableSchema = data;
}).fail(function () {
    console.error("Error loading schemaTables.json");
});

    // --- Helper Functions ---
    // Function to show a loading indicator (can be improved with spinners)
    function showLoading() {
    $("#container_table").html("<p class='text-center'>Loading data...</p>");
}

    // Function to handle API errors and display user-friendly messages
    function handleApiError(error, message = 'An error occurred') {
    console.error("API Error:", error);
    alert(message + ". Please check the console for details."); // Consider a better UI for error display
}

    // --- API Interaction Functions ---
    // Generic function to fetch items for a given table
    const getItems = async (table) => {
    try {
    const config = {
    headers: { authorization: localStorage.getItem("token") },
    zone_id: $("#zone_id_filter").val() // Use the filter input value
};
    const response = await axios.post(`${BASE_URL}/get_${table}/`, config);
    return response.data;
} catch (error) {
    handleApiError(error, `Failed to fetch data for table: ${table}`);
    throw error; // Re-throw to stop further processing if needed
}
};

    // --- Delete Functions ---
    function annul_delet() {
    $("#delet-confirmation-modal").modal("hide"); // Use 'hide' for Bootstrap 5
}

    const confirm_delet = async (table, id) => {
    try {
    const response = await axios.post(`${BASE_URL}/delet_${table}/`, {
    headers: { authorization: localStorage.getItem("token") },
    _id: id,
    token2: localStorage.getItem("token2"),
});
    if (response.data.success) {
    $("#delet-confirmation-modal").modal("hide");
    openTable(table); // Refresh the table
} else {
    alert("Delete failed: " + response.data.message);
}
} catch (error) {
    handleApiError(error, "Failed to delete item");
}
};

    const delet = async (table, id) => {
    $("#delet-confirmation-modal").modal("show"); // Use 'show' for Bootstrap 5
    $("#btn-conf-del").off('click').on('click', () => confirm_delet(table, id)); // Use .off() to prevent duplicate event handlers
    $("#modal-body-confirm-delet").text(`êtes-vous sûr de supprimer l'identifiant de l'appareil : ${id}`);
};

    // --- Edit Functions ---
    function annul_edit() {
    $("#edit-confirmation-modal").modal("hide"); // Use 'hide' for Bootstrap 5
}

    const confirm_edit = async (table, id) => {
    try {
    const etatValue = $("#input-etat").val();
    const response = await axios.post(`${BASE_URL}/edit_${table}/`, {
    headers: { authorization: localStorage.getItem("token") },
    _id: id,
    token2: localStorage.getItem("token2"),
    etat: etatValue,
});
    if (response.data.success) {
    $("#edit-confirmation-modal").modal("hide");
    openTable(table); // Refresh the table
} else {
    alert("Edit failed: " + response.data.message);
}
} catch (error) {
    handleApiError(error, "Failed to edit item");
}
};

    function edit(table, id, etat) {
    $("#edit-confirmation-modal").modal("show"); // Use 'show' for Bootstrap 5
    $("#btn-conf-edit").off('click').on('click', () => confirm_edit(table, id)); // Use .off() to prevent duplicate event handlers
    $("#input-etat").val(etat); // Set the current etat value in the edit modal
    $("#modal-body-confirm-edit p").text(`êtes-vous sûr d'éditer la ligne avec l'id : ${id}`);
}


    // --- Add New Functions ---
    function closeAddModal() {
    $("#add-modal").modal('hide');
}

    function openAddModal() {
    $("#add-modal").modal('show');
    const modalBody = $("#modal-body-add");
    modalBody.empty(); // Clear previous form

    const currentTableSchema = tableSchema.find(schema => schema.colunms_tab === currentTable);
    if (!currentTableSchema) {
    modalBody.html("<p>No schema found for this table to create form.</p>");
    return;
}

    const form = $('<form id="addItemForm"></form>');
    currentTableSchema.rows.forEach(fieldName => {
    if (fieldName !== '_id' && fieldName !== 'action') { // Exclude _id and action
    const formGroup = $('<div class="mb-3"></div>');
    const label = $(`<label for="${fieldName}" class="form-label">${fieldName}</label>`);
    const input = $('<input type="text" class="form-control" id="' + fieldName + '" name="' + fieldName + '">'); // Basic text input, adjust type as needed
    formGroup.append(label, input);
    form.append(formGroup);
}
});
    modalBody.append(form);

    $("#btn-conf-add").off('click').on('click', () => confirm_add(currentTable)); // Update confirm button click
}


    const confirm_add = async (table) => {
    try {
    const formData = {};
    $("#addItemForm").serializeArray().forEach(item => {
    formData[item.name] = item.value;
});

    const response = await axios.post(`${BASE_URL}/add_${table}/`, {
    headers: { authorization: localStorage.getItem("token") },
    token2: localStorage.getItem("token2"),
    ...formData // Send form data as payload
});

    if (response.data.success) {
    $("#add-modal").modal('hide');
    openTable(table); // Refresh table
} else {
    alert("Add failed: " + response.data.message);
}
} catch (error) {
    handleApiError(error, "Failed to add new item");
}
};


    // --- Table Display Function ---
    function openTable(table) {
    currentTable = table; // Update currentTable
    showLoading(); // Show loading indicator

    // Set active tab in navbar
    $("#tableTabs .nav-link").removeClass("active");
    $(`#${table}-tab`).addClass("active");

    // Load table HTML and then populate data
    $("#container_table").load(`table.html`, () => {
    loadTableData(table); // Call function to load data after table.html is loaded
});
}


    const loadTableData = async (table) => {
    try {
    const value = await getItems(table);
    let columnTable = "loading";
    let columnRows = [];
    let dataDataTable = [];
    const columnsDataTable = [];
    let tableColumnHtml = "";
    const FROM_PATTERN = "DD/MM/YYYY HH:mm";
    const TO_PATTERN = "YYYY-MM-DD HH:mm";

    tableSchema.find((o, index) => {
    o.colunms_tab === table && (columnRows = o.rows);
});

    if (table === "command") {
    value.find((o, index) => {
    dataDataTable.push(o.latestDate);
});
} else {
    dataDataTable = value;
}


    columnTable = columnRows.length === 0 ? Object.keys(dataDataTable[0] || {}) : columnRows;


    // Prepare data for DataTable - adding action buttons and formatting
    dataDataTable = dataDataTable.map((v) => ({
    ...v,
    action:
    `<button class='btn btn-danger btn-sm' onclick="delet('${table}','${v._id}')">Delete</button>
                         <button class='btn btn-info btn-sm ms-1' onclick="edit('${table}','${v._id}','${v.etat}')">Edit</button>`
}));

    if (table === "zone") {
    dataDataTable = dataDataTable.map((v) => ({
    ...v,
    coordinate: `<button type="button" class="btn btn-secondary btn-sm" data-bs-toggle="tooltip" data-bs-placement="top" title="${v.coordinate}">G Map Location</button>`,
}));
}
    if (table === "users") {
    dataDataTable = dataDataTable.map((v) => ({
    ...v,
    password: `<button type="button" class="btn btn-secondary btn-sm" data-bs-toggle="tooltip" data-bs-placement="top" title="${v.password}">Password</button>`,
    region: `<button type="button" class="btn btn-secondary btn-sm" data-bs-toggle="tooltip" data-bs-placement="top" title="${v.region}">G Map Location</button>`,
}));
}

    // Generate table header HTML
    for (const column of columnTable) {
    columnsDataTable.push({ data: column });
    tableColumnHtml += `<th>${column}</th>`;
}
    columnsDataTable.push({ data: "action" }); // Action column
    tableColumnHtml += "<th>Action</th>";

    $("#result").html(tableColumnHtml); // Set table header


    // Destroy existing DataTable instance if it exists
    if (dataTableInstance) {
    dataTableInstance.destroy();
}


    const targetDateColumnIndex = columnTable.indexOf("datetime") !== -1 ? columnTable.indexOf("datetime") : columnTable.indexOf("date_time");


    dataTableInstance = new DataTable("#datatable", {
    dom: '<"dt-top-container"<l><"dt-center-in-div"B><f>r>t<"dt-filter-spacer"f><ip>',
    buttons: ['copy', 'csv', 'excel'],
    processing: true,
    paging: true,
    columns: columnsDataTable,
    data: dataDataTable,
    responsive: true,
    columnDefs: targetDateColumnIndex !== -1 ? [{
    targets: targetDateColumnIndex,
    render: $.fn.dataTable.render.moment(FROM_PATTERN, TO_PATTERN)
}] : [],
    order: [[targetDateColumnIndex !== -1 ? targetDateColumnIndex : 0, "desc"]],
    createdRow: function (row, data, index) {
    // Row styling based on data values (example - adapt to your needs)
    if (data.etat === "off" || data.etat === false || data.style === "off" || data.style === false || data.type_action === "off" || data.type_action === "defb") {
    $(row).addClass("table-danger");
} else if (data.etat === "on" || data.etat === true || data.style === "on" || data.style === true || data.type_action === "on" || data.type_action === "defa") {
    $(row).addClass("table-success");
}
    if (table === "connection" && moment(data.datetime, FROM_PATTERN).isSame(dayjs().format(FROM_PATTERN), 'day')) {
    $(row).addClass("table-success");
} else if (table === "connection") {
    $(row).addClass("table-danger");
}
},
});
    // Enable Bootstrap tooltips
    $(function () {
    $('[data-bs-toggle="tooltip"]').tooltip();
});


} catch (error) {
    // Error handling is already done in getItems, handleApiError
}
};


    // --- Event Listeners and Initial Setup ---
    $(document).ready(function () {
    openTable('steg'); // Open 'steg' table by default on page load

    // Filter input event listener
    $("#zone_id_filter").on('input', function() {
    zoneIdFilterValue = $(this).val();
    if (currentTable) {
    openTable(currentTable); // Re-open/refresh the current table to apply filter
}
});
});
