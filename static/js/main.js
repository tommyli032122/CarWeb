// ========== Global Variables ==========
let carsData = [];
let lastClickedCar = null;
let reservationFormData = null;

// ========== Utility Functions ==========

// Load cars.json via AJAX
function loadCarsData(callback) {
    // Try both absolute and relative paths for compatibility with Live Server and deployment
    $.getJSON('data/cars.json')
        .done(function(data) {
            carsData = data;
            if (callback) callback();
        })
        .fail(function() {
            // Try with leading slash if first attempt fails
            $.getJSON('/data/cars.json')
                .done(function(data) {
                    carsData = data;
                    if (callback) callback();
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    $('#carGrid').html('<p class="reminder">Failed to load car data. Please check your server and data/cars.json path.</p>');
                    console.error('Error loading cars.json:', textStatus, errorThrown);
                });
        });
}

// Save last clicked car to localStorage
function saveLastClickedCar(car) {
    localStorage.setItem('lastClickedCar', JSON.stringify(car));
}

// Get last clicked car from localStorage
function getLastClickedCar() {
    const car = localStorage.getItem('lastClickedCar');
    return car ? JSON.parse(car) : null;
}

// Save reservation form data to localStorage
function saveReservationFormData(formData) {
    localStorage.setItem('reservationFormData', JSON.stringify(formData));
}

// Get reservation form data from localStorage
function getReservationFormData() {
    const data = localStorage.getItem('reservationFormData');
    return data ? JSON.parse(data) : null;
}

// ========== Homepage Functions ==========

function renderCarGrid(cars) {
    const $grid = $('#carGrid');
    $grid.empty();
    if (cars.length === 0) {
        $grid.append('<p class="no-result">No cars found.</p>');
        return;
    }
    cars.forEach(car => {
        const available = car.available;
        $grid.append(`
            <div class="car-card">
                <img src="${car.image}" alt="${car.brand} ${car.model}" class="car-image">
                <div class="car-info">
                    <h3>${car.brand} ${car.model}</h3>
                    <p>Type: ${car.type}</p>
                    <p>Price/Day: $${car.price_per_day}</p>
                    <p>Mileage: ${car.mileage}</p>
                    <p>FuelType: ${car.fuelType}</p>
                    <p class="availability ${available ? 'available' : 'unavailable'}">
                        ${available ? 'Available' : 'Unavailable'}
                    </p>
                </div>
                <button class="rent-btn" data-vin="${car.vin}" ${available ? '' : 'disabled'}>
                    ${available ? 'Rent' : 'Unavailable'}
                </button>
            </div>
        `);
    });
}

// Populate filter options
function populateFilters() {
    const types = [...new Set(carsData.map(car => car.type))];
    const brands = [...new Set(carsData.map(car => car.brand))];
    $('#filterType').append(types.map(type => `<option value="${type}">${type}</option>`));
    $('#filterBrand').append(brands.map(brand => `<option value="${brand}">${brand}</option>`));
}

// Filter and search cars
function filterAndSearchCars() {
    let keyword = $('#searchInput').val().toLowerCase();
    let type = $('#filterType').val();
    let brand = $('#filterBrand').val();
    let filtered = carsData.filter(car => {
        let matchKeyword = !keyword || (
            car.type.toLowerCase().includes(keyword) ||
            car.brand.toLowerCase().includes(keyword) ||
            car.model.toLowerCase().includes(keyword) ||
            car.description.toLowerCase().includes(keyword)
        );
        let matchType = !type || car.type === type;
        let matchBrand = !brand || car.brand === brand;
        return matchKeyword && matchType && matchBrand;
    });
    renderCarGrid(filtered);
}

// Real-time keyword suggestions
function setupSearchSuggestions() {
    $('#searchInput').on('input', function() {
        let input = $(this).val().toLowerCase();
        let suggestions = [];
        if (input.length > 0) {
            carsData.forEach(car => {
                [car.type, car.brand, car.model].forEach(field => {
                    if (field.toLowerCase().includes(input) && !suggestions.includes(field)) {
                        suggestions.push(field);
                    }
                });
            });
        }
        let $list = $('#suggestionList');
        $list.empty();
        suggestions.slice(0, 5).forEach(s => {
            $list.append(`<li class="suggestion-item">${s}</li>`);
        });
        $list.toggle(suggestions.length > 0);
    });

    // Click suggestion triggers search
    $('#suggestionList').on('click', '.suggestion-item', function() {
        $('#searchInput').val($(this).text());
        $('#suggestionList').hide();
        filterAndSearchCars();
    });

    // Hide suggestions on blur
    $('#searchInput').on('blur', function() {
        setTimeout(() => $('#suggestionList').hide(), 200);
    });
}

// Rent button click event
function setupRentButton() {
    $('#carGrid').on('click', '.rent-btn', function() {
        const vin = $(this).data('vin');
        const car = carsData.find(c => c.vin === vin);
        if (car && car.available) {
            saveLastClickedCar(car);
            window.location.href = '/templates/reservation.html';
        }
    });
}

// Filter change event
function setupFilters() {
    $('#filterType, #filterBrand').on('change', filterAndSearchCars);
}

// Search input event
function setupSearchInput() {
    $('#searchInput').on('input', filterAndSearchCars);
}

// ========== Reservation Page Functions ==========

function renderReservationPage() {
    const $content = $('#reservationContent');
    $content.empty();
    lastClickedCar = getLastClickedCar();
    if (!lastClickedCar) {
        $content.append('<p class="reminder">Please select a car from the homepage first.</p>');
        return;
    }
    // Try both relative and absolute paths for AJAX
    $.getJSON('data/cars.json')
        .done(function(data) {
            renderReservationCarDetail(data, $content);
        })
        .fail(function() {
            $.getJSON('/data/cars.json')
                .done(function(data) {
                    renderReservationCarDetail(data, $content);
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    $content.append('<p class="reminder">Failed to load car data. Please check your server and data/cars.json path.</p>');
                    console.error('Error loading cars.json:', textStatus, errorThrown);
                });
        });
}

function renderReservationCarDetail(data, $content) {
    const car = data.find(c => c.vin === lastClickedCar.vin);
    if (!car) {
        $content.append('<p class="reminder">Car not found. Please choose another car.</p>');
        return;
    }
    // Show car info
    $content.append(`
        <div class="car-detail">
            <img src="${car.image}" alt="${car.brand} ${car.model}" class="car-image">
            <div class="car-info">
                <h3>${car.brand} ${car.model}</h3>
                <p>Type: ${car.type}</p>
                <p>Price/Day: $${car.price_per_day}</p>
                <p>Description: ${car.description}</p>
                <p class="availability ${car.available ? 'available' : 'unavailable'}">
                    ${car.available ? 'Available' : 'Unavailable'}
                </p>
            </div>
        </div>
    `);
    if (!car.available) {
        $content.append('<p class="reminder">Sorry, this car is no longer available. Please choose another car.</p>');
        return;
    }
    // Reservation form
    reservationFormData = getReservationFormData() || {};
    $content.append(`
        <form id="reservationForm" autocomplete="off">
            <div class="form-group">
                <label>Name:</label>
                <input type="text" name="name" value="${reservationFormData.name || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-group">
                <label>Phone:</label>
                <input type="tel" name="phone" value="${reservationFormData.phone || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" value="${reservationFormData.email || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-group">
                <label>Driver's License Number:</label>
                <input type="text" name="license" value="${reservationFormData.license || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-group">
                <label>Start Date:</label>
                <input type="date" name="start_date" value="${reservationFormData.start_date || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-group">
                <label>Rental Period (days):</label>
                <input type="number" name="days" min="1" value="${reservationFormData.days || ''}" required>
                <span class="feedback"></span>
            </div>
            <div class="form-actions">
                <button type="button" id="cancelBtn">Cancel</button>
                <button type="submit" id="submitBtn" disabled>Submit</button>
            </div>
            <div id="totalPrice" class="total-price"></div>
            <div id="orderMsg"></div>
        </form>
    `);
    setupReservationForm(car);
}

// Validate form fields
function validateReservationForm($form) {
    let valid = true;
    $form.find('input').each(function() {
        const $input = $(this);
        const value = $input.val().trim();
        const name = $input.attr('name');
        let feedback = '';
        if (!value) {
            feedback = 'Required';
            valid = false;
        } else if (name === 'email' && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
            feedback = 'Invalid email';
            valid = false;
        } else if (name === 'phone' && !/^\d{8,}$/.test(value)) {
            feedback = 'Invalid phone';
            valid = false;
        } else if (name === 'license' && value.length < 5) {
            feedback = 'Invalid license';
            valid = false;
        } else if (name === 'days' && (isNaN(value) || value < 1)) {
            feedback = 'Invalid days';
            valid = false;
        }
        $input.next('.feedback').text(feedback);
    });
    return valid;
}

// Live feedback and enable submit
function setupReservationForm(car) {
    const $form = $('#reservationForm');
    function updateTotalAndButton() {
        if (validateReservationForm($form)) {
            const days = parseInt($form.find('input[name="days"]').val(), 10);
            const total = days * car.price_per_day;
            $('#totalPrice').text(`Total Price: $${total}`);
            $('#submitBtn').prop('disabled', false);
        } else {
            $('#totalPrice').text('');
            $('#submitBtn').prop('disabled', true);
        }
    }
    $form.on('input change', 'input', function() {
        updateTotalAndButton();
        // Save form data for reuse
        let formData = {};
        $form.serializeArray().forEach(item => formData[item.name] = item.value);
        saveReservationFormData(formData);
    });
    updateTotalAndButton();

    // Cancel button
    $('#cancelBtn').on('click', function() {
        localStorage.removeItem('reservationFormData');
        window.location.href = '/index.html';
    });

    // Submit event
    $form.on('submit', function(e) {
        e.preventDefault();
        if (!validateReservationForm($form)) return;
        // Simulate AJAX order submission
        $.getJSON('data/cars.json')
            .done(function(data) {
                handleOrderSubmission(data, car);
            })
            .fail(function() {
                $.getJSON('/data/cars.json')
                    .done(function(data) {
                        handleOrderSubmission(data, car);
                    })
                    .fail(function() {
                        $('#orderMsg').text('Order failed: Cannot access car data.').addClass('error');
                    });
            });
    });
}

function handleOrderSubmission(data, car) {
    const carData = data.find(c => c.vin === car.vin);
    if (!carData || !carData.available) {
        $('#orderMsg').text('Order failed: Car is no longer available.').addClass('error');
        return;
    }
    // Simulate order success: update localStorage (in real app, send to backend)
    carData.available = false;
    // Clear form data
    localStorage.removeItem('reservationFormData');
    // Hide the reservation form
    $('#reservationForm').hide();
    $('#totalPrice').text('');
    $('#submitBtn').prop('disabled', true);
    // Update car availability in localStorage for demo
    let updatedCars = data.map(c => c.vin === car.vin ? {...c, available: false} : c);
    localStorage.setItem('carsData', JSON.stringify(updatedCars));
    // Add a new element for order success message
    if ($('#orderSuccessMsg').length === 0) {
        $('#reservationContent').append(
            `<div id="orderSuccessMsg" class="order-success-msg" style="margin-top:32px;text-align:center;font-size:1.2rem;color:black;font-weight:700;">
                Order successful!<br>Your reservation has been placed.<br>We will contact you soon.<br>Thank you for choosing Go Car!
            </div>`
        );
    }
}

// ========== Page Initialization ==========

$(document).ready(function() {
    // Homepage
    if ($('#carGrid').length) {
        // Load cars data
        loadCarsData(function() {
            // If localStorage has updated cars, use them
            const localCars = localStorage.getItem('carsData');
            if (localCars) {
                carsData = JSON.parse(localCars);
            }
            renderCarGrid(carsData);
            populateFilters();
            setupSearchSuggestions();
            setupFilters();
            setupSearchInput();
            setupRentButton();
        });
    }
    // Reservation page
    if ($('#reservationContent').length) {
        renderReservationPage();
    }
});