const http = require('http');
const express = require('express');
const cors = require("cors");
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
const session = require('express-session');
//const MySQLStore = require('express-mysql-session')(session);
const multer=require("multer");
const fs=require("fs");

const app = express();
const server = http.createServer(app); // Create HTTP server using Express app

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('src'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Set up session store with MySQL


app.use(session({
    
    secret: 'Vhanarini064', // Secret key for session encryption (replace with your own secret)
    resave: false,
    saveUninitialized: true
    
}));

const upload = multer({ dest: 'uploads/' });




const config = {
    user: 'zwavhudi',
    password: 'Vhanarini064',
    host: 'mysqlserverforsdproject.mysql.database.azure.com',
    database: 'sdproject',
    ssl: {

        rejectUnauthorized: false
       
    }
};

const createConnectionPool = async () => {
    try {
        const pool = mysql.createPool(config);
        console.log('Connected to Azure MySQL database');
        return pool;
    } catch (error) {
        console.error('Error creating MySQL connection pool: ', error);
        throw error;
    }
};




//submit form data in the database

app.post('/submit', async (request, response) => {
  const { name, email, password, confirmPassword } = request.body;

  // Check if required fields are empty
  if (!name || !password || !confirmPassword || !email ) {
      return response.status(400).json({ error: 'All fields are required' });
  }

    //check if passwords match
    if (password !== confirmPassword) {
        return response.status(400).json({ error: 'Passwords do not match' });
    }
    if(password.length<8){
        return response.status(400).json({ error: 'Password too short' });
    }

  try {
    const pool = await createConnectionPool();
    const connection = await pool.getConnection();
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
        `INSERT INTO Admin (name, email, password) VALUES (?, ?, ?)`,
        [name, email, hashedPassword]
    );
    connection.release();
    response.status(201).json({ message: 'User created successfully' });
  
 }catch (error) {
      console.error('Error inserting data: ', error);
      response.status(500).json({ error: 'Internal server error' });
  }
});



//staff member is responsible for adding tenants
app.post('/submitTenant', async (request, response) => {
    const { name, email, password, confirmPassword} = request.body;
    console.log(request.body);
  
    // Check if required fields are empty
    if (!name || !password || !confirmPassword || !email) {
        return response.status(400).json({ error: 'All fields are required' });
    }
  
    // Check if passwords match
    if (password !== confirmPassword) {
        return response.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 8) {
        return response.status(400).json({ error: 'Password too short' });
    }
  
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
        const hashedPassword = await bcrypt.hash(password, 10);
  
        
        await connection.execute(
            `INSERT INTO Tenant (name, email, password) VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );
  
        connection.release();
        response.status(201).json({ message: 'User created successfully' });
  
    } catch (error) {
        console.error('Error inserting data: ', error);
        response.status(500).json({ error: 'Internal server error' });
    }
  });
  

//chek if user is in the database when trying to login

app.post('/login', async (request, response) => {
  console.log('request body: ', request.body);
  const { email, password } = request.body;

  try {
      const pool = await createConnectionPool();
      const connection = await pool.getConnection();

      let role = null;
      let user = null;

      // Check if the user exists in the Admin table
      let [adminRows, adminFields] = await connection.execute(
          'SELECT * FROM Admin WHERE BINARY email = ?',
          [email]
      );

      if (adminRows.length > 0) {
          user = adminRows[0];
          role = 'Admin';
      }

      // If the user is not found in the Admin table, check the Staff table
      if (!user) {
          let [staffRows, staffFields] = await connection.execute(
              'SELECT * FROM Staff_Administrator WHERE BINARY email = ?',
              [email]
          );

          if (staffRows.length > 0) {
              user = staffRows[0];
              role = 'administrator'; // Assuming the role is stored in the Staff table
          }
      }

      if (!user) {
        let [staffRows, staffFields] = await connection.execute(
            'SELECT * FROM Staff_maintanance WHERE BINARY email = ?',
            [email]
        );

        if (staffRows.length > 0) {
            user = staffRows[0];
            role = 'maintanance'; // Assuming the role is stored in the Staff table
        
            //store ID of maintanance
            const selectedMaintananceID = staffRows[0].id; // get id of selected maintenance
                request.session.selectedMaintananceID = selectedMaintananceID; // store it in the session
                console.log('Maintenance ID:', selectedMaintananceID);
        }
    }

      // If the user is still not found, check the Tenant table
      if (!user) {
          let [tenantRows, tenantFields] = await connection.execute(
              'SELECT * FROM Tenant WHERE BINARY email = ?',
              [email]
          );

          if (tenantRows.length > 0) {
              user = tenantRows[0];
              role = 'Tenant';

               // Replace 'the_tenant_id_here' with the actual tenant ID
    
              const tenantId = tenantRows[0].id;
              request.session.tenantId = tenantId; // Assuming 'id' is the column name for the tenant's ID
              console.log('Tenant ID:', tenantId);
              
          }
      }

      connection.release();

      if (user) {
          const isPasswordMatch = await bcrypt.compare(password, user.password);

          if (isPasswordMatch) {
              response.status(200).json({ success: true, name: user.name, role: role, message: 'Login successful' });
          } else {
              response.status(401).json({ success: false, message: 'Invalid email or password' });
          }
      } else {
          response.status(401).json({ success: false, message: 'Invalid email or password' });
      }

  } catch (error) {
      console.error('Error querying database: ', error);
      //response.status(500).json({ error: 'Internal server error' });
  }
});

// Handle Issue Reporting Endpoint
app.post('/report-issue', async (request, response) => {
    const { issue, month } = request.body; // Destructure issue and month from the request body
    console.log("The request body: ", request.body);
  
    try {
        const pool = await createConnectionPool(); // Assuming you have a function to create a connection pool
        const connection = await pool.getConnection();
  
        // Insert the new issue into the database
        await connection.execute(
            'INSERT INTO issue_reports (issue, month) VALUES (?, ?)', // Include month in the SQL statement
            [issue, month]
        );
  
        connection.release();
  
        // Emit a new-issue event to notify staff members
        // Implement your event emission logic here if needed
  
        response.status(201).json({ message: 'Issue reported successfully' });
    } catch (error) {
        console.error('Error reporting issue:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
  });

  
// Handle GET request to fetch reported issues
app.get('/reported-issues', async (req, res) => {
  try {
      const pool = await createConnectionPool();
      const connection = await pool.getConnection();

      // Retrieve all reported issues from the database
      const [rows] = await connection.execute('SELECT id,issue,month FROM issue_reports');

      const ids = rows.map(row => row.id);
      const issues = rows.map(row => row.issue);
      const months= rows.map(row => row.month)

      connection.release();

      
   

      // Send the list of reported issues to the client including the month
      res.status(200).json({issues,ids,months });
      
  } catch (error) {
      console.error('Error fetching reported issues:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

//get tenants
app.get('/get-users', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        // Retrieve all reported issues from the database
        const [rows] = await connection.execute('SELECT name,email,id FROM Tenant');
  
        const ids = rows.map(row => row.id);
        const names = rows.map(row => row.name);
        const emails = rows.map(row => row.email);
  
        connection.release();
  
        
     
  
        // Send the list of reported issues to the client
        res.status(200).json({names,emails,ids });
        
    } 
    catch (error) {
        console.error('Error fetching reported issues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//get feedback from maintanance
app.get('/get-maintanace-feedback', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        // Retrieve all reported issues from the database
        const [rows] = await connection.execute('SELECT id,issueAssigned ,feedback FROM MaintenanceIssues WHERE feedback IS NOT NULL');
  
        const ids = rows.map(row => row.id);
        const issueAssigneds= rows.map(row => row.issueAssigned);
        const feedbacks = rows.map(row => row.feedback);
  
        connection.release();
  
        
     
  
        // Send the list of reported issues to the client
        res.status(200).json({issueAssigneds,feedbacks,ids });
        
    } 
    catch (error) {
        console.error('Error fetching reported issues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//getting total number of issues
const getTotalIssuesCount = async () => {
  try {
      const pool = await createConnectionPool();
      const connection = await pool.getConnection();

      // Retrieve the count of reported issues from the database
      const [result] = await connection.execute('SELECT COUNT(*) as totalCount FROM issue_reports');

      connection.release();

      return result[0].totalCount;
  } catch (error) {
      console.error('Error fetching total issues count:', error);
      throw error;
  }
};

//assign maintanance
app.post('/assign-to-maintanace', async (req, res) => {
    console.log('request body is: ',req.body);
    const { issue,month, selectedMaintenanceID } = req.body;

    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        // Insert a new issue with the selectedMaintenanceID
        const sql = `
            INSERT INTO MaintenanceIssues (issueAssigned, month, selectedMaintananceID)
            VALUES (?, ?, ?)
        `;
        await connection.execute(sql, [issue,month, selectedMaintenanceID]);

        connection.release();

        console.log('Issue inserted successfully');
        res.status(201).json({ message: 'Issue assigned successfully' });
    } catch (error) {
        console.error('Error assigning issue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});





// add feedback to the issues that might be complete Denzel

app.post('/update-feedback/:id', async (req, res) => {
    const { feedback } = req.body; // Destructure feedback and month from the request body
    const issueId = req.params.id;

    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        const sql = 'UPDATE MaintenanceIssues SET feedback = ? WHERE id = ?'; // Update SQL query to include month
        await connection.execute(sql, [feedback, issueId]); // Pass feedback, month, and issueId as parameters

        connection.release();
        console.log('Feedback given successfully');
        res.status(201).json({ message: 'Feedback given successfully' });
    } catch (error) {
        console.error('Error giving feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// get total issues for maintanace guy Denzel
app.get('/total-issues', async (req, res) => {
    try {

        //retrieve maintanance id from the session
        const selectedMaintananceID=req.session.selectedMaintananceID

        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        // Retrieve all reported issues from the database
        const [rows] = await connection.execute('SELECT id,issueAssigned FROM MaintenanceIssues where feedback is null and selectedMaintananceID=?', [selectedMaintananceID]);
        
        // Extract ids and issues from the rows
        const ids = rows.map(row => row.id);
        const issues = rows.map(row => row.issueAssigned); // Use 'issueAssigned' instead of 'issue'
        const selectedMaintananceIDs=rows.map(row => row.selectedMaintananceID);
        connection.release();
        
        console.log("Rows", rows);

        
        
        // Send the list of reported issues to the client
        res.status(200).json({issues,ids,selectedMaintananceIDs });
    } catch (error) {
        console.error('Error fetching reported issues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});








//delete issues after completing them
app.delete('/delete-issue/:id', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        const issueId = req.params.id;
        console.log("Deleting issue with ID:", issueId);
  
        // Query to delete the issue from the database
        const sql = 'DELETE FROM issue_reports WHERE id = ?';
  
        // Execute the SQL query to delete the issue
        const [result] = await connection.execute(sql, [issueId]);
  
        connection.release();
  
        console.log('Issue deleted successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting issue:', error);
        res.status(500).json({ error: 'Error deleting issue' });
    }
  });
  
//delete tenants as a staff member
app.delete('/delete-user/:id', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        const Id = req.params.id;
        console.log("Deleting user with ID:", Id);
  
        // Query to delete the issue from the database
        const sql = 'DELETE FROM Tenant WHERE id = ?';
  
        // Execute the SQL query to delete the issue
        const [result] = await connection.execute(sql, [Id]);
  
        connection.release();
  
        console.log('Issue deleted successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting issue:', error);
        res.status(500).json({ error: 'Error deleting issue' });
    }
  });
  

//administrator adds staff members
app.post('/add-staff', async (request, response) => {
    const { name, email, password, confirmPassword, role } = request.body;
    console.log(request.body);

    // Check if required fields are empty
    if (!name || !email || !password || !confirmPassword || !role ) {
        return response.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return response.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
        return response.status(400).json({ error: 'Password too short' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    

    try {
        
        if(role=="maintanance"){

            const pool = await createConnectionPool();
            const connection = await pool.getConnection();

        

            await connection.execute(
                `INSERT INTO staff_maintanance (name, email, password) VALUES (?, ?, ?)`,
                [name, email, hashedPassword]
            );

            connection.release();
            response.status(201).json({ message: `Staff member added successfully` });


        }
        else if(role=="administrator"){

            const pool = await createConnectionPool();
            const connection = await pool.getConnection();

        

            await connection.execute(
                `INSERT INTO staff_administrator (name, email, password) VALUES (?, ?, ?)`,
                [name, email, hashedPassword]
            );

            connection.release();
            response.status(201).json({ message: `Staff member added successfully` });

        }
        else{
            response.status(400).json({ error: 'unknown role' });
        }
    } catch (error) {
        console.error(`Error adding staff: `, error);
        response.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/search/staff', async(req, res) => {
    try {
        const searchQuery = req.query.query;
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        const [adminResults] = await connection.execute(
            'SELECT id, name, email FROM Staff_Administrator WHERE name LIKE ? OR email LIKE ?',
            [`%${searchQuery}%`, `%${searchQuery}%`]
        );

        const [maintenanceResults] = await connection.execute(
            'SELECT id, name, email FROM Staff_Maintenance WHERE name LIKE ? OR email LIKE ?',
            [`%${searchQuery}%`, `%${searchQuery}%`]
        );

        connection.release();

        const results = [...adminResults, ...maintenanceResults];
        res.json(results);

    } catch (error) {
        console.error('Error searching for staff members:', error);
        res.status(500).json({ error: 'An error occurred while searching staff members' });
    }
});


//delete staf members as an admin
app.delete('/staff/:id', async(req, res) => {
    try {
        const staffId = req.params.id;
        
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        // Determine the role based on the table being deleted from
        let tableName = '';

        // Check if the staff member is in the Administrators table
        const [adminRows] = await connection.execute(`SELECT id FROM Staff_Administrator WHERE id = ?`, [staffId]);
        if (adminRows.length > 0) {
            tableName = 'Staff_Administrator';
        } else {
            // Check if the staff member is in the Maintenance table
            const [maintenanceRows] = await connection.execute(`SELECT id FROM staff_maintanance WHERE id = ?`, [staffId]);
            if (maintenanceRows.length > 0) {
                tableName = 'Staff_Maintanance';
            } else {
                // If the staff member is not found in any table, return an error
                return res.status(404).json({ error: 'Staff member not found' });
            }
        }

        // Delete the staff member from the determined table
        await connection.execute(`DELETE FROM ${tableName} WHERE id = ?`, [staffId]);
        connection.release();
        res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff member:', error);
        res.status(500).json({ error: 'An error occurred while deleting the staff member' });
    }
});

app.get('/all-staff', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        // Query both Administrator and Maintenance tables to get all staff members
        const [adminResults] = await connection.execute('SELECT id, name, email FROM Staff_Administrator');
        const [maintenanceResults] = await connection.execute('SELECT id, name, email FROM Staff_Maintanance');

        connection.release();

        // Combine results from both tables
        const allStaffMembers = [...adminResults, ...maintenanceResults];

        res.json(allStaffMembers);
    } catch (error) {
        console.error('Error fetching all staff members:', error);
        res.status(500).json({ error: 'An error occurred while fetching all staff members' });
    }
});



//sprint 3

//get all tenants so that when u issue a fine u can select who the fine is being issued to 
app.get('/recipients', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
  
        // Retrieve name and id of recipients from the database
        const [rows] = await connection.execute('SELECT id, name FROM Tenant');
        
        // Extract name and id from the rows
        const recipients = rows.map(row => ({
            id: row.id,
            name: row.name
        }));
        
        connection.release();
        
        // Send the list of recipients to the client
        res.status(200).json(recipients);
    } catch (error) {
        console.error('Error fetching recipients from database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//get all maintanance people so that they be populated on the dropdow when an issue is assigned
app.get('/get-maintanance', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        const [rows] = await connection.execute('SELECT id, name FROM Staff_maintanance');

        const maintananceFetched = rows.map(row => ({
            id: row.id,
            name: row.name
        }));

        

        connection.release();

        res.status(200).json(maintananceFetched);
    } catch (error) {
        console.log('Error fetching maintenance from database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


//send the form to the database

app.post('/submit-form', async (request, response) => {
    const { title, description, amount, selectedRecipientId, action,month } = request.body;
    console.log(request.body);
    try {
        

        // Assuming you have already established a MySQL connection pool named 'pool'

        const pool = await createConnectionPool();
        const connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO fines (title, description, amount, action, tenantID, month) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, amount, action, selectedRecipientId, month]
        );
        connection.release();
        response.status(201).json({ message: 'User created successfully' });


        
    } 
    catch (error) {
        console.error('Error inserting form data into database:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});

// //get all fines from the database
app.get('/get-fines', async (req, res) => {
    try {
        const pool = await createConnectionPool(); // Assuming you have a function to create a connection pool
        const connection = await pool.getConnection();

        // Retrieve fines with tenant names from the database
        const [rows] = await connection.execute('SELECT fines.id, fines.title, fines.description, fines.amount, fines.action,fines.paidAmount, tenant.name FROM fines INNER JOIN tenant ON fines.tenantID = tenant.id');

        connection.release();

        // Extract data from rows
        const finesData = rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            amount: row.amount,
            action: row.action,
            tenantName: row.name,
            paidAmount:row.paidAmount // Assuming 'name' is the column name for tenant names
            
        }));

        // Send fines data to the client
        res.status(200).json(finesData);

    } catch (error) {
        console.error('Error fetching fines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//get all fines as a tenant
app.get('/get-fines-tenant', async (req, res) => {
    try {
        // Retrieve the tenant's ID from the session
        const tenantId = req.session.tenantId;

        // Assuming you have a function to create a connection pool
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        // Retrieve fines with tenant names from the database, filtered by tenant ID
        const [rows] = await connection.execute('SELECT fines.id, fines.title, fines.description, fines.amount, fines.action, fines.paidAmount FROM fines  WHERE fines.tenantID = ?', [tenantId]);

        connection.release();

        // Extract data from rows
        const finesData = rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            amount: row.amount,
            action: row.action,
           
            paidAmount: row.paidAmount // Assuming 'name' is the column name for tenant names
        }));

        // Send fines data to the client
        res.status(200).json(finesData);

    } catch (error) {
        console.error('Error fetching fines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//update the paid amount
app.post('/send-payment', async (request, response) => {
    const { paidAmount, fineId } = request.body;
  
    try {
      const pool = await createConnectionPool();
      const connection = await pool.getConnection();
      
      await connection.execute(
          `UPDATE fines SET paidAmount = paidAmount + ? WHERE id = ?`,
          [paidAmount, fineId]
      );
      connection.release();
      response.status(201).json({ message: 'Payment successful' });
    
   } catch (error) {
        console.error('Error updating paid amount:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});


//send notification
app.post('/send-notification', upload.single('image'), async (request, response) => {
    const message = request.body.message;
    let image = '';

    // Check if an image file was uploaded
    if (request.file) {
        // Get the uploaded image filename
        const filename = request.file.filename;
        
        // Define the relative path to the uploaded image
        image = '/uploads/' + filename;

        try {
            // Move the uploaded image to the 'uploads' directory
            fs.renameSync(request.file.path, path.join(__dirname,'src', 'uploads', filename));
        } catch (error) {
            console.error('Error moving uploaded image:', error);
            return response.status(500).json({ error: 'Failed to store image' });
        }
    }

    try {
        const pool = await createConnectionPool(); // Assuming you have a function to create a connection pool
        const connection = await pool.getConnection();

        // Insert the new notification into the database
        await connection.execute(
            `INSERT INTO notifications (message, image_url) VALUES (?, ?)`,
            [message, image]
        );

        connection.release();

        response.status(201).json({ message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Error sending notification:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});

//fetch notification
app.get('/notifications', async (req, res) => {
    try {
        // Establish a connection to the database
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        // Query to fetch notifications from the database
        const [rows, fields] = await connection.execute('SELECT * FROM notifications');

        // Release the connection
        connection.release();

        // Send the notifications data as JSON response
        res.json(rows);
    } 
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//fetch notification details
app.get('/notification', async (req, res) => {
    try {
        // Establish a connection to the database
        const pool = await createConnectionPool(); // Assuming createConnectionPool() is a function that creates a connection pool
        const connection = await pool.getConnection();

        // Extract notification ID from the query parameters
        const notificationId = req.query.id;

        // Query to fetch notification details from the database based on the ID
        const [rows, fields] = await connection.execute('SELECT * FROM notifications WHERE id = ?', [notificationId]);

        // Release the connection
        connection.release();

        // Check if notification with the given ID exists
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Extracting relevant fields for the notification
        const notification = {
            id: rows[0].id,
            message: rows[0].message,
            image: rows[0].image_url
            // Add other fields as needed
        };

        // Send the notification data as JSON response
        res.json(notification);
    } 
    catch (error) {
        console.error('Error fetching notification details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



//get data related to fines. i.e all fines, paid and unpaid fines
function generateFullMonthSet() {
    const months = [
        "January", "February", "March", "April", "May", "June"
    ];
    return months.map(month => ({ month, num_fines: 0, num_unpaid_fines: 0, num_paid_fines: 0 }));
}

app.get('/fines-data', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(`
            SELECT 
                month, 
                COUNT(*) AS num_fines,
                SUM(CASE WHEN paidAmount = 0 THEN 1 ELSE 0 END) AS num_unpaid_fines,
                SUM(CASE WHEN paidAmount != 0 THEN 1 ELSE 0 END) AS num_paid_fines
            FROM fines 
            GROUP BY month
        `);
        connection.release();

        const fullMonthSet = generateFullMonthSet();

        rows.forEach(({ month, num_fines, num_unpaid_fines, num_paid_fines }) => {
            const index = fullMonthSet.findIndex(item => item.month.toLowerCase() === month.toLowerCase());
            if (index !== -1) {
                fullMonthSet[index].num_fines = num_fines;
                fullMonthSet[index].num_unpaid_fines = num_unpaid_fines;
                fullMonthSet[index].num_paid_fines = num_paid_fines;
            }
        });

        fullMonthSet.sort((a, b) => {
            return new Date('2000 ' + a.month) - new Date('2000 ' + b.month);
        });

        res.json(fullMonthSet);
    } catch (error) {
        console.error('Error fetching fines data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//denzel

function generateFullMonthSet2() {
    const months = [
        { number: "01", name: "January" },
        { number: "02", name: "February" },
        { number: "03", name: "March" },
        { number: "04", name: "April" },
        { number: "05", name: "May" },
        { number: "06", name: "June" }
        // Add the remaining months as needed
    ];
    return months.map(month => ({ ...month, num_of_assigned_issues: 0, num_open_tickets: 0, num_closed_tickets: 0 }));
}

app.get('/issues-table-data', async (req, res) => {
    try {
        const pool = await createConnectionPool();
        const connection = await pool.getConnection();

        const [rows] = await connection.execute(`
            SELECT 
                LPAD(month, 2, '0') AS month, 
                COUNT(*) AS num_of_assigned_issues,
                SUM(CASE WHEN feedback IS NULL THEN 1 ELSE 0 END) AS num_open_tickets,
                SUM(CASE WHEN feedback IS NOT NULL THEN 1 ELSE 0 END) AS num_closed_tickets
            FROM MaintenanceIssues 
            GROUP BY month
        `);
        connection.release();

        const fullMonthSet = generateFullMonthSet2();

        rows.forEach(({ month, num_of_assigned_issues, num_open_tickets, num_closed_tickets }) => {
            const index = fullMonthSet.findIndex(item => item.number === month);
            if (index !== -1) {
                fullMonthSet[index].num_of_assigned_issues = num_of_assigned_issues;
                fullMonthSet[index].num_open_tickets = num_open_tickets;
                fullMonthSet[index].num_closed_tickets = num_closed_tickets;
            }
        });

        fullMonthSet.sort((a, b) => a.number - b.number);

        res.json(fullMonthSet);
    } catch (error) {
        console.error('Error fetching issues data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});





server.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
